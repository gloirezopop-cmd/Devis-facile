# INTÉGRATION PAIEMENT CHARIOW — DEVIS FACILE BTP
## Spécification corrigée, vérifiée sur la documentation officielle `chariow.dev`

> **Implémenté** (le gel du backend a été levé pour cette seule pièce, à la demande explicite du fondateur). Le pseudo-code ci-dessous reste le document de référence pour les règles ; le code réel vit dans :
> - `maj_paiement_chariow.sql` (racine) — migration des tables,
> - `supabase/functions/chariow-checkout/` et `supabase/functions/chariow-webhook/` — les deux Edge Functions,
> - `packages/app/src/components/offres/Paywall.jsx` — le bouton qui les appelle,
> - `packages/app/scripts/verifier-offres.mjs` (sections M et N) — les contrôles automatiques.
>
> Voir `supabase/README.md` pour la marche à suivre de déploiement, et l'entrée n°3 de `FRONTEND_BACKEND_REQUESTS.md` pour ce qui reste volontairement non fait (job de réconciliation, bouton « Restaurer mon achat », rate limiting).
>
> Le pseudo-code de ce document reste écrit en style Express/SQL générique ; l'implémentation réelle est en Deno (Edge Function) pour le code serveur et en SQL idiomatique Supabase pour les tables — les deux respectent les mêmes règles, seule la syntaxe diffère.

---

## 0. À FAIRE MAINTENANT, AVANT TOUT LE RESTE

1. **Révoquer la clé `sk_...` exposée.** app.chariow.com → **Paramètres → Clés API** → supprimer, puis générer une nouvelle clé.
2. **Purger l'historique.** Si la clé a été commitée sur Git, la supprimer du dépôt ne suffit pas : elle reste dans l'historique. Révoquer est la seule action qui compte.
3. **Vérifier les ventes récentes** dans le tableau de bord pour détecter une utilisation anormale.
4. **Ne jamais recoller une clé secrète dans un chat, un ticket, une capture d'écran ou un prompt.** Une clé collée dans une conversation IA est compromise, quelle que soit la plateforme.

> Il faut **deux** secrets distincts, pas un seul (voir §4) : la clé API et le secret de signature du Pulse sont deux objets indépendants.

---

## 1. CE QUI ÉTAIT FAUX OU MANQUANT DANS LA VERSION PRÉCÉDENTE DU BRIEF

| # | Point du brief initial | Diagnostic | Correction |
|---|---|---|---|
| 1 | « Backend vérifie que l'événement est valide » | **Faille critique.** Aucune méthode donnée. L'endpoint webhook est une URL publique : sans vérification de signature, n'importe qui peut y envoyer un faux `successful.sale` et s'attribuer PRO gratuitement. | Vérification **HMAC-SHA256** obligatoire de l'en-tête `x-chariow-signature`, sur le **corps brut**, avec le **secret de Pulse** (`whsec_...`) — §6 |
| 2 | Clé unique `CHARIOW_API_KEY` | **Incomplet.** Le secret de signature des webhooks est indépendant de la clé API : il n'en dérive pas. Utiliser la clé API pour vérifier la signature ne produira jamais de correspondance. | Deux variables : `CHARIOW_API_KEY` (`sk_live_...`) **et** `CHARIOW_PULSE_SECRET` (`whsec_...`) |
| 3 | Redirection vers des URLs de checkout fixes (`mychariow.shop/prd_.../checkout`) | **Erreur d'architecture.** Ces liens statiques ne transportent aucune information sur l'utilisateur. Le webhook ne peut identifier le payeur que par son e-mail — il suffit qu'il paie avec une autre adresse pour que l'abonnement ne s'active jamais. C'est exactement le lien statique utilisé aujourd'hui par `ModalePaiementMock.jsx`. | Appeler **`POST https://api.chariow.com/v1/checkout`** côté serveur avec `custom_metadata: { user_id, plan, intent_id }`. Ces métadonnées reviennent **dans le payload du webhook** — §5 |
| 4 | `webhook_events.event_id UNIQUE` | **Mauvaise clé.** Le payload Chariow ne contient pas de champ `event_id`. La clé d'idempotence est l'en-tête **`x-pulse-delivery-id`**. Il ne faut **pas** dédupliquer sur l'ID de vente : une même vente produit une livraison par Pulse abonné. | Dédupliquer sur `x-pulse-delivery-id`, plus un garde-fou métier (§7.3) |
| 5 | Rien sur le délai de réponse ni les retries | **Piège opérationnel.** Chaque tentative expire à **30 s**. Une livraison a **5 tentatives** (10 s, 100 s, ~17 min, ~2 h 47). **Après la 5ᵉ tentative échouée, le Pulse est désactivé automatiquement** : tous les paiements suivants cessent d'être notifiés, silencieusement. | Répondre `200` **immédiatement**, traiter en asynchrone, monitorer (§10) |
| 6 | Produits Chariow non typés | **Blocage fonctionnel.** Les produits *Téléchargeable*, *Cours* et *Bundle* renvoient `already_purchased` au deuxième achat. Une offre à l'unité (ex. 500 FCFA) et un abonnement renouvelable seraient bloqués dès le 2ᵉ achat. | Utiliser des produits de type **Licence** : achat répété toujours autorisé, avec `expires_at` natif et événements `license.expired` / `license.nearing_expiry` (§3) |
| 7 | Aucune vérification du montant | **Faille.** Un code de réduction ou un changement de devise peut faire passer un PRO annuel à un montant dérisoire. | Vérifier `sale.amount.value` et `sale.amount.currency` contre le prix attendu du plan avant activation (§7.2) |
| 8 | « Backend définit la date d'expiration » | **Règle non spécifiée.** Calculer depuis `now` fait perdre les jours restants à l'utilisateur qui renouvelle en avance. | `expires_at = MAX(now, expires_at_actuel) + durée_du_plan` (§7.4) |
| 9 | Rien sur la page de retour | **Risque.** L'utilisateur arrive sur la page de succès avant le webhook, ou sans avoir payé. | La `redirect_url` **n'accorde jamais l'accès** : elle affiche un état d'attente et interroge le backend (§7.5) |
| 10 | Aucun mécanisme de rattrapage | Si le Pulse a été désactivé ou l'endpoint indisponible, le paiement est encaissé mais l'abonnement jamais activé. | Job de réconciliation + bouton « Restaurer mon achat » (§9) |

**Ce qui était juste et à garder :** jamais de clé secrète côté client, jamais de `status: "paid"` envoyé par le frontend, décision toujours prise côté serveur, table d'idempotence, activation pilotée par webhook.

---

## 2. ARCHITECTURE CORRIGÉE

```
UTILISATEUR (connecté)
   │  POST /api/payments/checkout  { plan: "pro_annuel" }
   ▼
BACKEND DEVIS FACILE
   │  1. vérifie la session utilisateur
   │  2. résout plan → product_id + prix attendu
   │  3. crée un payment_intent en base (intent_id)
   │  4. POST https://api.chariow.com/v1/checkout
   │        custom_metadata: { user_id, plan, intent_id }
   │        redirect_url:    https://devisfacile.../paiement/retour
   ▼
CHARIOW  →  checkout_url  →  paiement (MoMo / OM / carte)
   │
   │  POST signé  x-chariow-signature / x-pulse-delivery-id
   ▼
BACKEND  /api/webhooks/chariow
   │  1. lit le CORPS BRUT
   │  2. vérifie HMAC-SHA256 → sinon 401
   │  3. déduplique sur x-pulse-delivery-id
   │  4. répond 200 (< 30 s)
   ▼
FILE D'ATTENTE (traitement asynchrone)
   │  5. event == successful.sale ?
   │  6. lit sale.custom_metadata.user_id / plan / intent_id
   │  7. vérifie montant + devise + statut
   │  8. active l'abonnement, calcule expires_at
   ▼
BASE DE DONNÉES → accès débloqué
```

---

## 3. CONFIGURATION DES PRODUITS DANS CHARIOW

Créer les offres en **produits de type Licence**. C'est le seul type qui autorise l'achat répété, et il porte nativement une date d'expiration.

| Offre | Type Chariow | Durée de licence | Motif |
|---|---|---|---|
| Correction / déblocage à l'unité | Licence | sans expiration | Achat répété autorisé (chaque achat = nouvelle clé) |
| PRO mensuel | Licence | 30 jours | `expires_at` natif + `license.nearing_expiry` à J-7 |
| PRO annuel | Licence | 365 jours | idem |

**Réglage important :** si l'application gère elle-même ses utilisateurs (c'est le cas ici), mettre `requires_activation` à `false` dans les paramètres de licence du produit. Chariow émet alors la licence déjà active, avec la validité qui démarre à l'achat — pas d'activation par appareil à gérer.

**Contraintes de l'API checkout à connaître :**
- Le produit doit être **publié**, sinon `404`.
- Les types **Service**, **Coaching** et la tarification **prix libre** ne passent pas par l'API checkout.
- Limite de débit : **100 requêtes/minute** par clé API.

> ⚠️ Point à trancher côté produit : la grille tarifaire actuelle (`ModalePaiementMock.jsx` : Calcul 3 500 FCFA/mois, PRO 5 500 FCFA/mois, PRO Annuel 50 000 FCFA/an — voir `PROMPT-ANTIGRAVITY-REFONTE-FRONTEND.md` §5 pour la grille validée) doit être recréée à l'identique côté Chariow, en produits Licence, avant de coder le mapping `PLANS` du §5 ci-dessous.

---

## 4. VARIABLES D'ENVIRONNEMENT

```bash
# Clé API — appels sortants vers Chariow (checkout, licences, ventes)
CHARIOW_API_KEY=sk_live_xxxxxxxxxxxx

# Secret de signature du Pulse — vérification des webhooks entrants
# Automations → Pulses → le Pulse → onglet Overview → Signing secret
CHARIOW_PULSE_SECRET=whsec_xxxxxxxxxxxx

CHARIOW_API_BASE=https://api.chariow.com/v1
APP_URL=https://devisfacile.example
```

Règles absolues :
- Jamais de préfixe `NEXT_PUBLIC_` / `VITE_` / `REACT_APP_` sur ces deux variables.
- Jamais dans un fichier commité. `.env` dans `.gitignore`.
- La rotation du secret de Pulse est **immédiate et irréversible** : l'ancien secret cesse de fonctionner à la seconde. Mettre à jour la variable d'environnement dans la même fenêtre.

---

## 5. ENDPOINT DE CHECKOUT (BACKEND)

```js
// POST /api/payments/checkout
// Body attendu du frontend : { plan: "calcul" | "devis_complet" | "pro_annuel" }

const PLANS = {
  calcul:        { product_id: 'prd_xxxxxxxx', prix: 3500,  devise: 'XAF', duree_jours: 30  },
  pro:           { product_id: 'prd_xxxxxxxx', prix: 5500,  devise: 'XAF', duree_jours: 30  },
  pro_annuel:    { product_id: 'prd_xxxxxxxx', prix: 50000, devise: 'XAF', duree_jours: 365 },
};
// ⚠️ Remplacer les product_id par les IDs réels des produits Licence créés en §3,
//    et faire correspondre exactement les prix à la grille validée du prompt Antigravity §5.

app.post('/api/payments/checkout', requireAuth, async (req, res) => {
  const user = req.user;                       // JAMAIS depuis le body
  const plan = PLANS[req.body?.plan];

  if (!plan) return res.status(400).json({ error: 'Plan inconnu' });

  // Trace serveur de l'intention — sert de pont avec le webhook
  const intent = await db.paymentIntents.create({
    user_id: user.id,
    plan: req.body.plan,
    montant_attendu: plan.prix,
    devise_attendue: plan.devise,
    status: 'pending',
  });

  const ip = (req.headers['cf-connecting-ip']
           ?? req.headers['x-forwarded-for']?.split(',')[0]?.trim());

  const r = await fetch(`${process.env.CHARIOW_API_BASE}/checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CHARIOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: plan.product_id,
      email:      user.email,
      first_name: user.first_name,
      last_name:  user.last_name,
      phone: { number: user.phone_number, country_code: user.phone_country ?? 'CM' },
      payment_currency: plan.devise,
      customer_ip: ip,                          // détermine les moyens de paiement affichés
      redirect_url: `${process.env.APP_URL}/paiement/retour?intent=${intent.id}`,
      custom_metadata: {                        // ← LE PONT AVEC LE WEBHOOK
        user_id:   String(user.id),
        plan:      req.body.plan,
        intent_id: String(intent.id),
      },
    }),
  });

  const body = await r.json();

  if (!r.ok) {
    await db.paymentIntents.update(intent.id, { status: 'error' });
    return res.status(502).json({ error: 'Paiement indisponible, réessayez.' });
  }

  switch (body.data.step) {
    case 'payment':
      await db.paymentIntents.update(intent.id, { sale_id: body.data.purchase.id });
      return res.json({ checkout_url: body.data.payment.checkout_url });

    case 'completed':                            // produit gratuit
      await activerAcces({ userId: user.id, plan: req.body.plan, saleId: body.data.purchase.id });
      return res.json({ redirect: '/tableau-de-bord' });

    case 'already_purchased':
      return res.status(409).json({ error: 'Offre déjà acquise' });
  }
});
```

**Contraintes `custom_metadata` :** maximum 10 clés, 255 caractères par valeur, clés alphanumériques et underscores uniquement. Les valeurs doivent être des **chaînes**.

**Codes d'erreur à gérer :** `401` clé invalide · `404` produit inexistant ou non publié · `422` validation, prix libre, type non supporté, code promo invalide.

---

## 6. ENDPOINT WEBHOOK — VÉRIFICATION DE SIGNATURE

Le point le plus important de tout le document. Sans ce bloc, le système de paiement est ouvert.

**Contrat de signature Chariow :**

| Propriété | Valeur |
|---|---|
| Algorithme | HMAC-SHA256 |
| En-tête | `x-chariow-signature` |
| Format | `sha256=<64 caractères hex minuscules>` |
| Donnée signée | **Les octets bruts du corps HTTP**, tels que reçus |
| Clé | Le secret de Pulse `whsec_...` |
| Horodatage | Aucun (par conception) |

```js
const crypto = require('crypto');

app.post('/api/webhooks/chariow',
  express.raw({ type: 'application/json' }),      // ← corps BRUT, pas express.json()
  async (req, res) => {

    const recu = req.header('x-chariow-signature') ?? '';
    const attendu = 'sha256=' + crypto
      .createHmac('sha256', process.env.CHARIOW_PULSE_SECRET)
      .update(req.body)                           // Buffer brut
      .digest('hex');

    const a = Buffer.from(recu);
    const b = Buffer.from(attendu);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).send('Invalid signature');
    }

    const deliveryId = req.header('x-pulse-delivery-id');

    // Événement de test du tableau de bord : pas de delivery-id, payload avec un champ "note"
    if (!deliveryId) return res.status(200).send('OK (test)');

    if (await db.webhookDeliveries.exists(deliveryId)) {
      return res.status(200).send('OK (duplicate)');
    }
    await db.webhookDeliveries.create({
      delivery_id: deliveryId,
      event: req.header('x-pulse-event'),
      payload: req.body.toString('utf8'),
    });

    res.status(200).send('OK');                   // acquitter AVANT de traiter

    queue.push({ deliveryId, payload: JSON.parse(req.body.toString('utf8')) });
  }
);
```

### Erreurs à ne pas commettre

| Erreur | Conséquence |
|---|---|
| `express.json()` avant la vérification | Le corps est déjà parsé, la signature ne correspondra jamais |
| `JSON.stringify(req.body)` pour recalculer le HMAC | Chariow envoie du JSON compact avec les slashes échappés (`https:\/\/`) et les caractères non-ASCII en `\uXXXX`. Une re-sérialisation détruit le digest — et l'échec ne sera **intermittent** que sur les payloads contenant des URLs ou des accents |
| `===` pour comparer les signatures | Vulnérable aux attaques temporelles. Utiliser `crypto.timingSafeEqual` |
| `timingSafeEqual` sans contrôle de longueur | Lève une exception au lieu de renvoyer `false` |
| Utiliser `CHARIOW_API_KEY` comme clé HMAC | Aucune signature ne correspondra jamais. Le secret de Pulse est indépendant |
| Traiter avant de répondre | Dépassement des 30 s → retry → au bout de 5 échecs, **Pulse désactivé** |

---

## 7. LOGIQUE D'ACTIVATION

### 7.1 Événements à traiter

| Événement | Action |
|---|---|
| `successful.sale` | Activer / prolonger l'accès |
| `failed.sale` | Marquer l'intention en échec, notifier l'utilisateur |
| `abandoned.sale` | Relance marketing uniquement, aucun accès |
| `license.expired` | Rétrograder vers l'offre gratuite |
| `license.nearing_expiry` | E-mail de relance (J-7, envoyé une seule fois) |
| `license.revoked` | Révoquer l'accès immédiatement (remboursement) |

### 7.2 Contrôles avant activation — tous obligatoires

```js
async function traiterVente(payload) {
  const { sale, product, customer } = payload;
  const meta = sale.custom_metadata ?? {};

  if (sale.status !== 'completed')            return rejeter('statut non complété');

  const userId = meta.user_id;
  const plan   = PLANS[meta.plan];
  if (!userId || !plan)                       return rejeter('métadonnées absentes');

  // Le produit payé doit être celui du plan annoncé
  if (product.id !== plan.product_id)         return rejeter('produit incohérent');

  // Le montant doit correspondre — protège contre les codes promo et les bascules de devise
  if (sale.amount.value    < plan.prix)       return rejeter('montant insuffisant');
  if (sale.amount.currency !== plan.devise)   return rejeter('devise inattendue');

  await activerAcces({ userId, plan: meta.plan, saleId: sale.id, intentId: meta.intent_id });
}
```

> `rejeter()` **journalise et alerte**, il ne renvoie pas d'erreur HTTP : la réponse `200` a déjà été émise. Un rejet signifie un paiement encaissé sans accès accordé — il doit apparaître dans le monitoring et déclencher un traitement manuel.

### 7.3 Idempotence à deux niveaux

Une relecture manuelle depuis le tableau de bord Chariow crée une **nouvelle** `x-pulse-delivery-id` : elle passera le contrôle d'idempotence et sera retraitée. C'est le comportement voulu par Chariow, mais il ne doit pas prolonger l'abonnement deux fois.

```
Niveau 1 — transport : x-pulse-delivery-id UNIQUE   (bloque les retries)
Niveau 2 — métier    : sale_id UNIQUE dans payments (bloque les replays)
```

### 7.4 Calcul de l'expiration

```js
const base = (abonnementActuel?.expires_at && abonnementActuel.expires_at > new Date())
  ? abonnementActuel.expires_at     // renouvellement anticipé : on cumule
  : new Date();                     // nouveau ou expiré : on repart de maintenant

expires_at = addDays(base, plan.duree_jours);
```
Prévoir un **délai de grâce** (48 h par défaut) après `expires_at` avant de couper l'accès : en mobile money, un renouvellement peut se confirmer avec du retard.

### 7.5 Page de retour

La `redirect_url` ne donne **aucun droit**. Elle affiche un écran d'attente qui interroge le backend :

```
GET /api/payments/intents/:id/status  →  { status: "pending" | "active" | "failed" }
```
Sonder toutes les 2 s pendant 60 s. Au-delà : « Paiement en cours de confirmation, vous recevrez un e-mail. » Ne jamais afficher « paiement réussi » sur la seule foi de la redirection.

---

## 8. SCHÉMA DE BASE DE DONNÉES CORRIGÉ

> À adapter en migration Supabase (`schema.sql`) avec RLS quand ce chantier sera ouvert — voir la règle §2 du prompt Antigravity : ce fichier est actuellement interdit d'écriture.

```sql
CREATE TABLE payment_intents (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  plan            TEXT NOT NULL,
  montant_attendu INTEGER NOT NULL,
  devise_attendue TEXT NOT NULL,
  sale_id         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',   -- pending|active|failed|abandoned
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  intent_id       BIGINT REFERENCES payment_intents(id),
  plan            TEXT NOT NULL,
  sale_id         TEXT NOT NULL UNIQUE,              -- ← garde-fou métier (§7.3)
  montant         INTEGER NOT NULL,
  devise          TEXT NOT NULL,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Recouvre le besoin n°2 de FRONTEND_BACKEND_REQUESTS.md (plan d'abonnement)
CREATE TABLE subscriptions (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  plan            TEXT NOT NULL,
  status          TEXT NOT NULL,                     -- active|expired|revoked
  license_key     TEXT,
  license_id      TEXT,
  started_at      TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ,
  grace_until     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX ON subscriptions (user_id) WHERE status = 'active';

-- Déblocages à l'unité (offre à la carte) : consommables, pas un abonnement
CREATE TABLE entitlements (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  type       TEXT NOT NULL,                          -- ex. 'correction_qcm'
  reference  TEXT,                                   -- ex. id du QCM concerné
  sale_id    TEXT NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  delivery_id  TEXT PRIMARY KEY,                     -- x-pulse-delivery-id
  event        TEXT NOT NULL,
  payload      JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  error        TEXT,
  received_at  TIMESTAMPTZ DEFAULT now()
);
```

> Le déblocage à l'unité **n'est pas un abonnement**. Le mettre dans `subscriptions` obligerait à des statuts hybrides ingérables. Table séparée.

---

## 9. RATTRAPAGE ET RÉCONCILIATION

Un webhook peut être manqué : endpoint indisponible, déploiement en cours, Pulse désactivé après 5 échecs. Deux filets de sécurité :

**Job horaire.** Pour chaque `payment_intent` en `pending` depuis plus de 15 minutes :
```
GET /v1/sales/{sale_id}   →  si status = completed, activer
```

**Bouton « Restaurer mon achat ».** Dans le compte utilisateur : il saisit sa clé de licence ou son e-mail d'achat, le backend interroge
```
GET /v1/licenses/{key}   →  vérifier is_active et is_expired
```
et rattache la licence à son compte. Indispensable en contexte mobile money, où l'utilisateur paie parfois depuis un numéro ou une adresse différente de son compte.

---

## 10. EXPLOITATION

**Politique de retry Chariow :** 5 tentatives — 10 s, 100 s, ~17 min, ~2 h 47. Timeout de 30 s par tentative. La signature est calculée une seule fois à l'envoi et reste valable pour toutes les tentatives.

**Le risque à surveiller :** après la 5ᵉ tentative échouée sur une seule livraison, **le Pulse est désactivé automatiquement**. Un e-mail est envoyé au propriétaire de la boutique, mais entre-temps aucun paiement n'est plus notifié. Il faut le réactiver manuellement depuis le tableau de bord.

À mettre en place :
- Alerte si aucune livraison reçue depuis 24 h alors qu'il y a des ventes.
- Alerte sur tout `rejeter()` (§7.2) : paiement encaissé sans accès.
- Surveillance de l'onglet **Deliveries** du Pulse : il montre le code HTTP et la réponse exacte de l'endpoint, ce qui évite d'instrumenter soi-même.
- Endpoint webhook obligatoirement en **HTTPS** — Chariow refuse le HTTP.

**Développement local :** ngrok pour exposer le serveur, puis « Send test pulse ». Attention : l'événement de test est signé comme un vrai mais n'a **pas** de `x-pulse-delivery-id` et contient un champ `note` supplémentaire. Pour valider la chaîne complète, utiliser plutôt **Replay** sur une vraie livraison depuis l'onglet Deliveries.

---

## 11. CHECKLIST DE SÉCURITÉ

- [ ] Ancienne clé `sk_...` révoquée
- [ ] `CHARIOW_API_KEY` et `CHARIOW_PULSE_SECRET` en variables serveur, sans préfixe public
- [ ] Aucun `product_id`, prix ou URL de checkout codé en dur dans le frontend
- [ ] Le frontend envoie `{ plan }` et rien d'autre — jamais `user_id`, jamais `status`, jamais un montant
- [ ] `user_id` lu depuis la session serveur, jamais depuis le corps de la requête
- [ ] Signature HMAC vérifiée sur le **corps brut** avant toute action
- [ ] Comparaison en temps constant
- [ ] `401` sur signature absente ou invalide
- [ ] Déduplication sur `x-pulse-delivery-id` **et** contrainte unique sur `sale_id`
- [ ] Montant, devise et `product_id` vérifiés avant activation
- [ ] `200` renvoyé en moins de 30 s, traitement asynchrone
- [ ] La page de retour n'accorde aucun accès
- [ ] Rate limiting sur `/api/payments/checkout` (prévenir le spam d'intentions)
- [ ] Job de réconciliation actif
- [ ] Aucun secret dans les logs (ne jamais journaliser les en-têtes complets)

---

## 12. SCÉNARIOS DE TEST

| Scénario | Résultat attendu |
|---|---|
| Signature absente | `401`, aucun accès |
| Signature falsifiée | `401`, aucun accès |
| Payload rejoué avec la même `delivery-id` | `200`, aucun double traitement |
| Replay manuel (nouvelle `delivery-id`, même `sale_id`) | `200`, bloqué au niveau métier, abonnement non prolongé deux fois |
| Payload contenant une URL ou un accent | Signature valide — vérifie l'absence de re-sérialisation |
| Montant inférieur au prix du plan | Rejet + alerte, aucun accès |
| `custom_metadata` absent | Rejet + alerte, traitement manuel |
| Endpoint indisponible 20 min | Rattrapé par le retry à ~2 h 47 ou par le job de réconciliation |
| Renouvellement 10 jours avant expiration | `expires_at` cumulé, les 10 jours ne sont pas perdus |
| Deuxième achat de l'offre à l'unité | Autorisé — confirme que le produit est bien de type Licence |
| Endpoint qui met 45 s à répondre | Doit être corrigé : retry déclenché, risque de désactivation du Pulse |

---

## 13. SOURCES

Toutes les valeurs techniques de ce document proviennent de la documentation officielle Chariow :
- `chariow.dev/fr/guides/checkout` — API checkout, `custom_metadata`, `redirect_url`, `customer_ip`, codes d'erreur, restrictions de types de produits
- `chariow.dev/en/guides/pulse-security` — contrat de signature HMAC-SHA256, encodage du corps, idempotence
- `chariow.dev/en/guides/pulses` — liste des événements, structure des payloads, politique de retry, désactivation automatique
- `chariow.dev/en/guides/saas-license-integration` — modèle de paywall par licence, `requires_activation`
- `chariow.dev/api-reference/introduction` — URL de base, authentification, limite de 100 req/min

La documentation pouvant évoluer, revérifier le contrat de signature et la liste des événements avant la mise en production.
