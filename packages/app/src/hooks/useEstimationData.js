import { useEffect, useState } from 'react';
import {
  fetchCountries, fetchBuildingTypes, fetchStandings, fetchLocations,
} from '../lib/estimationApi.js';

/**
 * Charge les listes de référence depuis Supabase — jamais codées dans le
 * frontend (§17). Les localisations et les tarifs dépendent du pays choisi et
 * se rechargent quand il change ; le reste se charge une seule fois.
 *
 * Chaque chargement est asynchrone et n'empêche jamais l'assistant de
 * s'afficher : `chargement` distingue « pas encore de données » de
 * « aucune donnée », pour ne jamais confondre un chargement en cours avec
 * une liste réellement vide.
 */
export function useEstimationData(countryId) {
  const [countries, setCountries] = useState([]);
  const [buildingTypes, setBuildingTypes] = useState([]);
  const [standings, setStandings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    Promise.all([fetchCountries(), fetchBuildingTypes(), fetchStandings()]).then(
      ([c, bt, st]) => {
        if (annule) return;
        setCountries(c);
        setBuildingTypes(bt);
        setStandings(st);
        setChargement(false);
      },
    );
    return () => { annule = true; };
  }, []);

  useEffect(() => {
    let annule = false;
    if (!countryId) {
      setLocations([]);
      return;
    }
    fetchLocations(countryId).then((l) => {
      if (!annule) setLocations(l);
    });
    return () => { annule = true; };
  }, [countryId]);

  return { countries, buildingTypes, standings, locations, chargement };
}
