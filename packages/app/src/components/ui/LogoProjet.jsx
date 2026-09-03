import React, { useRef } from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Icone from './Icone.jsx';

const TAILLE_MAX = 800 * 1024; // 800 Ko — un logo n'a pas besoin d'être plus lourd, et ça reste raisonnable en localStorage.

/**
 * Logo du projet — stocké en data URL dans parametresProjet, donc partagé
 * partout où l'en-tête du devis apparaît (écran, PDF, Excel).
 */
export default function LogoProjet({ size = 56 }) {
  const { parametresProjet, setParametresProjet } = useProjet();
  const toast = useToast();
  const inputRef = useRef(null);
  const logo = parametresProjet?.logo;

  const choisirFichier = (e) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    if (!fichier.type.startsWith('image/')) {
      toast("Le logo doit être une image (PNG, JPG…).", 'erreur');
      return;
    }
    if (fichier.size > TAILLE_MAX) {
      toast('Image trop lourde (800 Ko maximum).', 'erreur');
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => {
      setParametresProjet({ ...parametresProjet, logo: lecteur.result });
      toast('Logo enregistré.');
    };
    lecteur.readAsDataURL(fichier);
  };

  const retirer = (e) => {
    e.stopPropagation();
    setParametresProjet({ ...parametresProjet, logo: undefined });
  };

  return (
    <div className="group relative shrink-0" style={{ width: size, height: size }}>
      <button
        onClick={() => inputRef.current?.click()}
        title={logo ? 'Changer le logo' : 'Ajouter un logo'}
        className="grid h-full w-full place-items-center overflow-hidden rounded-md border border-dashed border-brand-primary/25 bg-brand-bg hover:border-brand-interactive"
        style={{ width: size, height: size }}
      >
        {logo ? (
          <img src={logo} alt="Logo du projet" className="h-full w-full object-contain" />
        ) : (
          <Icone nom="folder" size={18} className="text-brand-text/30" />
        )}
      </button>
      {logo && (
        <button
          onClick={retirer}
          title="Retirer le logo"
          className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 place-items-center rounded-full bg-red-500 text-white group-hover:grid"
        >
          <Icone nom="x" size={12} />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={choisirFichier} className="hidden" />
    </div>
  );
}
