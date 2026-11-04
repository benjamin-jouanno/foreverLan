# Forever LAN

Journal de quêtes Angular en français pour une LAN World of Warcraft.

## Lancement

```sh
npm install
npm start
```

Ouvrir http://localhost:4200. `npm run build` génère la version de production dans `dist/forever-lan/browser`.

Les 11 quêtes officielles sont prédéfinies dans `src/main.ts` : 9 **En jeu** et 2 **IRL**, pour un total de **13 pièces**. Les repas et discours sont IRL ; les niveaux, donjons, défis dans WoW et la capture des personnages sont en jeu. Cliquer sur une ligne ouvre une fenêtre avec sa description, son objectif et ses pièces. La validation se fait uniquement avec « Terminer la quête » dans cette fenêtre. Une quête terminée ne peut rapporter ses pièces qu’une seule fois.

## Ouverture de la LAN

L’écran d’attente affiche un compte à rebours jusqu’au **6 novembre 2026 à 20 h, heure de Paris** (`2026-11-06T20:00:00+01:00`, soit 19 h UTC). Il se met à jour chaque seconde à partir de l’heure de l’appareil, y compris après la mise en veille d’un onglet. À zéro, l’application devient accessible sans rechargement. La création du profil est proposée après l’ouverture seulement, si aucun profil valide n’est enregistré. La date est définie par `LAN_START` dans `src/main.ts`.

Pour consulter l’application avant cette date, ouvrir `/admin` (par exemple http://localhost:4200/admin). Cet accès anticipé ne s’applique qu’à cette URL ; revenir à `/` affiche à nouveau le compte à rebours. Le profil est demandé normalement s’il est absent. L’onglet des codes secrets conserve son déverrouillage par code. En hébergement statique, configurer le renvoi des chemins de l’application vers `index.html`, comme pour toute entrée directe Angular.

## Profil d’aventurier

À la première visite, une fenêtre demande le nom (1 à 32 caractères), la race et la classe. Le profil est enregistré dans `forever-lan-profile-v1` et réutilisé aux visites suivantes. Le panneau de l’aventurier affiche son nom, sa race, sa classe et une icône de classe. Cliquer sur ce panneau permet de modifier le profil sans modifier les quêtes ou les pièces. Un profil absent ou invalide ouvre de nouveau la création.

Les sélections proposent les huit races et neuf classes de base ; les listes se trouvent dans `RACES` et `CLASSES` dans `src/main.ts`.

## Hauts faits cachés

Les hauts faits sont des quêtes secrètes indépendantes des quêtes classiques. Dans leur onglet, saisir un code valide révèle et termine automatiquement le secret associé. Les codes acceptent les minuscules et les espaces autour de la saisie ; un code déjà utilisé ne rapporte aucune pièce supplémentaire. Le solde additionne les pièces des quêtes classiques et des secrets découverts.

Catalogue organisateur : `HIDDEN_QUESTS` dans `src/main.ts`. Les 13 hauts faits officiels rapportent **14 pièces** au total. Les codes sont consultables dans l’onglet Admin :

| Code | Haut fait | Pièces |
| --- | --- | --- |
| `LAN-A7K2` | Bienvenue en Azeroth | 1 |
| `LAN-M4R9` | Bêêêê ! | 1 |
| `LAN-P8D3` | Le marchand de sable | 1 |
| `LAN-V2N6` | Le dernier survivant | 1 |
| `LAN-C9F4` | Le jukebox humain | 1 |
| `LAN-H3T7` | Le ventre sur pattes | 1 |
| `LAN-B6W2` | Le râleur professionnel | 1 |
| `LAN-Q5J8` | Un véritable ami | 1 |
| `LAN-E7S3` | Pas touche à mon pote ! | 1 |
| `LAN-Z4L9` | Le boulet du groupe | 1 |
| `LAN-G2X6` | Le père Noël | 1 |
| `LAN-U8Y5` | Le malicieux | 1 |
| `LAN-K9D7` | Le héros inattendu | 2 |

La sauvegarde séparée utilise `forever-lan-hidden-completed-v1` et ne contient que les identifiants débloqués. Les anciens secrets de démonstration ne valident aucun de ces hauts faits et ne rapportent plus de pièces. Les codes et descriptions ne sont pas affichés avant découverte, sauf dans l’onglet Admin. Comme toute application entièrement locale, le catalogue reste consultable dans le code du navigateur.

## Catalogue de la taverne

La taverne présente neuf gourmandises et boissons, filtrables par catégorie : Kinder Maxi, bonbons, pancake au chocolat, cookie, chips, pop-corn, soda, jus de fruits et chocolat chaud. La carte et ses prix (1 ou 2 pièces) sont provisoires et modifiables dans `TAVERN_ITEMS` dans `src/main.ts`. Le catalogue défile dans son panneau. Il présente les échanges possibles auprès du tavernier, sans effectuer de commande ni de débit automatique.

## Règles de Gamble Gamble

L’onglet doré « Gamble Gamble » explique le « Random pour les hommes ». Les deux joueurs lancent `/rand 6` dans WoW. Le plus grand jet gagne la différence, versée par le perdant. À égalité, chacun perd le montant de son jet. Un joueur ne peut payer que les pièces qu’il possède ; en cas de paiement insuffisant, le gagnant ne reçoit que le montant effectivement payé. Cette page est informative : aucun lancer, transfert ou débit n’est effectué par l’application.

## Accès administrateur

Dans le champ de code des hauts faits, saisir exactement `BenichouAdmin31600` (majuscules et minuscules respectées, sans espace supplémentaire). L’onglet **Admin** apparaît et s’ouvre pour présenter tous les codes, les quêtes cachées associées, leurs descriptions et leurs pièces.

Le mode administrateur est conservé dans le `sessionStorage` de cet onglet et peut être quitté avec « Quitter le mode admin ». Le code administrateur ne valide aucune quête et ne rapporte aucune pièce. Ce fonctionnement reste entièrement local, sans serveur.

Vérifier les transitions et la sauvegarde avec `node --test tests/quest-state.test.cjs`.

Seuls les identifiants terminés sont enregistrés dans le localStorage sous `forever-lan-completed-v2`. Les quêtes officielles utilisent des identifiants distincts de la démonstration : les validations de démonstration ne les terminent pas et ne rapportent plus de pièces. La progression des hauts faits cachés reste inchangée.

La progression est propre à chaque navigateur et appareil, sans synchronisation entre participants. Effacer les données du navigateur efface la progression.

L’interface reprend une ambiance de taverne : cadres dorés, journal sur parchemin, détails de quête, progression et hauts faits. Les fenêtres peuvent être fermées par le bouton de fermeture, la touche Échap ou un clic à l’extérieur. Les onglets « La Taverne » et « Règles » présentent le fonctionnement de la LAN et du journal.

Le décor illustré est intégré dans `public/assets/tavern-background.png`. Il a été généré avec ImageGen à partir de la référence fournie ; la consigne est documentée dans `public/assets/README.md`. Les panneaux sont réalisés en HTML/CSS. Les polices Google Fonts sont facultatives ; des polices système prennent le relais hors connexion.
