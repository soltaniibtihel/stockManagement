# Med Oil Project - Machine Learning Pipeline

Ce module contient le pipeline de Machine Learning (Python/FastAPI) utilisé pour prédire les demandes de stocks et recommander des quantités d'approvisionnement.

## Prérequis
- Python 3.9 ou supérieur.

## 1. Installation

Installez les dépendances nécessaires dans un environnement virtuel Python en utilisant le fichier `requirements.txt` :

```bash
# S'il n'y a pas d'environnement virtuel
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installation
pip install -r requirements.txt
```

## 2. Entraîner le modèle avec vos propres données Excel/CSV

Pour actualiser l'intelligence de l'IA avec vos véritables informations venant de Med Oil (Option d'import manuelle) :

1. Prenez votre fichier d'export contenant l'historique des quantités (Mouvements de Stocks ou Productions).
2. Vérifiez que votre fichier Excel (`.xlsx`) ou CSV contient au moins ces deux colonnes dans l'en-tête de la première ligne :
   - `date` (Ex: 2023-01-01)
   - `quantity` (Ex: 15)
3. Placez votre fichier dans le dossier `data/` et renommez-le `stock_data.csv` ou `stock_data.xlsx` selon votre format.
4. Lancez le script d'entraînement :
```bash
python train.py
```
Le modèle va se calibrer sur vos données réelles, afficher ses performances (RMSE, MAE, R²), et enregistrer son cerveau dans `models/model.pkl`.

## 3. Lancer l'API FastAPI

Une fois le modèle entraîné, vous pouvez lancer l'API qui communiquera avec votre Dashboard React ou votre backend SpringBoot.

```bash
uvicorn main:app --reload
```

L'API sera disponible sur `http://127.0.0.1:8000`.

### Documentation Interactive Automatique
Vous pouvez tester directement l'API via l'interface générée en allant sur :
[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Exemple de Requête POST (JSON)
L'intelligence n'attend plus de variables mathématiques complexes en URL. Vous n'avez qu'à lui envoyer par requête POST l'historique brut des X derniers jours (au moins 3) des quantités physiques vendues/mues, et l'API calcule ses propres indicateurs en temps réel.
URL : `POST /predict`
```json
{
  "historical_quantities": [10, 15, 20, 22, 25, 28, 30]
}
```
