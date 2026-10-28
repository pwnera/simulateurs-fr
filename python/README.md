# calculsalairebrutnet

Le moteur de calcul de [calculsalairebrutnet.fr](https://www.calculsalairebrutnet.fr) en Python : salaire brut et net, cotisations, impôt sur le revenu, indemnités de licenciement et de rupture conventionnelle, chômage (ARE), APL, prime d'activité, heures supplémentaires, congés payés, préavis, solde de tout compte, et revenus des freelances (TJM, micro-entreprise, EURL, SASU, portage salarial). Barèmes français 2026.

Python 3.9+, sans dépendance, hors ligne, typé.

```sh
pip install calculsalairebrutnet
```

```py
from calculsalairebrutnet import brut_to_net, auto_entrepreneur

brut_to_net(brut_mensuel=3000, statut="cadre")["net_mensuel"]  # 2369.71
auto_entrepreneur(activite="services_bnc", ca_mensuel=5000)["net_mensuel"]  # 3710.0
```

C'est un portage fidèle du moteur TypeScript qui tourne sur le site ([`@calculsalairebrutnet/core`](https://www.npmjs.com/package/@calculsalairebrutnet/core)) : mêmes fonctions en `snake_case`, résultats en dictionnaires, et 1 789 cas de référence vérifiés à 1e-9 près à chaque modification.

Code et tests : [github.com/pwnera/simulateurs-fr](https://github.com/pwnera/simulateurs-fr). Résultats indicatifs. Licence MIT.
