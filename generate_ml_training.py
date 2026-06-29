"""
Genere un fichier Excel d'historique pour l'entainement du modele ML.
Format attendu par ml/preprocessing.py :
  - date     : date de la transaction
  - quantite : quantite vendue / consommee
  - article  : code produit (optionnel mais recommande)
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import date
import random
import os

random.seed(2024)

output_dir = r'C:\Users\hamza\Desktop'

HEADER_BG = '1E293B'
HEADER_FG = 'F1F5F9'
ROW_BG1   = 'F8FAFC'
ROW_BG2   = 'EFF6FF'

thin   = Side(style='thin', color='CBD5E1')
border = Border(left=thin, right=thin, top=thin, bottom=thin)

def hdr(ws, col, row, val, width=18):
    c = ws.cell(row=row, column=col, value=val)
    c.font      = Font(bold=True, color=HEADER_FG, name='Arial', size=11)
    c.fill      = PatternFill('solid', start_color=HEADER_BG)
    c.alignment = Alignment(horizontal='center', vertical='center')
    c.border    = border
    ws.column_dimensions[get_column_letter(col)].width = width

def put(ws, row, col, val, bg=None, fmt=None):
    c = ws.cell(row=row, column=col, value=val)
    c.font      = Font(name='Arial', size=9)
    c.alignment = Alignment(horizontal='center', vertical='center')
    c.border    = border
    if bg:
        c.fill = PatternFill('solid', start_color=bg)
    if fmt:
        c.number_format = fmt
    return c

def season(month):
    if month in [6, 7, 8]:   return 1.30
    if month in [11, 12]:    return 1.20
    if month in [1, 2]:      return 1.10
    return 1.0

# Produits avec leurs codes et demandes mensuelles typiques
products = [
    # Produits finis (ventes - SO)
    ('HJ-VEG-5L',  'Huile Vegetale 5L',              4000,  8000),
    ('HJ-VEG-2L',  'Huile Vegetale 2L',              2500,  5000),
    ('HJ-VEG-1L',  'Huile Vegetale 1L',              1500,  3500),
    ('HJ-TRN-5L',  'Huile de Tournesol 5L',          3000,  7000),
    ('HJ-TRN-2L',  'Huile de Tournesol 2L',          1800,  4500),
    ('HJ-MAS-1L',  'Huile de Mais 1L',               1200,  3000),
    ('HJ-SOJ-5L',  'Huile de Soja 5L',               1500,  4000),
    ('HJ-MAR-500', 'Margarine de Table 500g',         6000, 14000),
    ('HJ-MAR-250', 'Margarine de Table 250g',         4000, 10000),
    ('HJ-PRO-1KG', 'Margarine Professionnelle 1kg',  2000,  6000),
    ('HJ-FEU-2KG', 'Margarine Feuilletage 2kg',       800,  2500),
    ('HJ-SAT-490', 'Sauce Tomate 490g',               4000,  9000),
    ('HJ-SAH-380', 'Sauce Harissa 380g',              3000,  7000),
    ('HJ-SAP-200', 'Sauce Piquante 200ml',            1500,  4000),
    ('HJ-MAY-490', 'Mayonnaise Classique 490g',       5000, 12000),
    ('HJ-MAL-490', 'Mayonnaise Legere 490g',          2500,  6000),
    ('HJ-MAA-300', 'Mayonnaise a l Ail 300g',         1500,  4000),
    # Matieres premieres (consommation - quantites en kg ou tonnes*100)
    ('OB-SOJ',     'Huile de Soja Brute',              8000, 18000),
    ('OB-PAL',     'Huile de Palme Brute',             6000, 14000),
    ('OB-TRN',     'Huile de Tournesol Brute',         5000, 12000),
    ('OB-MAS',     'Huile de Mais Brute',              3000,  8000),
    ('PF-5L',      'Preform PET 5L',                  40000, 85000),
    ('PF-2L',      'Preform PET 2L',                  20000, 50000),
    ('ADD-LEC',    'Lecithine de Soja',                  500,  2000),
    ('ADD-SEL',    'Sel Raffine Alimentaire',             800,  3000),
]

# ═══════════════════════════════════════════════════════════════
# FICHIER ML TRAINING : historique_ml_training.xlsx
# Colonnes : date | quantite | article
# Periode  : Jan 2022 → Dec 2024 (36 mois)
# ═══════════════════════════════════════════════════════════════
wb = openpyxl.Workbook()

# ─── Onglet 1 : Donnees aggregees par mois (RECOMMANDE pour ML) ──
ws1 = wb.active
ws1.title = 'Historique Mensuel (pour ML)'
ws1.row_dimensions[1].height = 32

# Note explicative en ligne 1
note = ws1.cell(row=1, column=1,
    value='FICHIER POUR ENTRAINEMENT ML — Uploader cet onglet via le bouton "Entrainer le modele IA" du Dashboard')
note.font = Font(bold=True, color='065F46', size=10, name='Arial')
note.fill = PatternFill('solid', start_color='D1FAE5')
ws1.merge_cells('A1:C1')
note.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
ws1.row_dimensions[1].height = 28

# Headers ligne 2
for i, (h, w) in enumerate([('date', 14), ('quantite', 14), ('article', 20)], 1):
    hdr(ws1, i, 2, h, w)

row = 3
for yr in [2022, 2023, 2024]:
    for mo in range(1, 13):
        sf = season(mo)
        # Un total mensuel par produit
        for code, name, qmin, qmax in products:
            # Tendance croissante : +5% par an
            trend = 1.0 + 0.05 * (yr - 2022)
            qty   = round(random.uniform(qmin, qmax) * sf * trend)
            d     = date(yr, mo, 1)
            bg    = ROW_BG1 if row % 2 == 0 else ROW_BG2
            put(ws1, row, 1, d, bg=bg, fmt='MM/YYYY')
            put(ws1, row, 2, qty, bg=bg)
            put(ws1, row, 3, code, bg=bg)
            row += 1

ws1.freeze_panes = 'A3'
ws1.auto_filter.ref = f'A2:C{row-1}'
print(f'Onglet 1 (Mensuel) : {row - 3} lignes ({36} mois x {len(products)} produits)')

# ─── Onglet 2 : Donnees journalieres (plus granulaire) ──
ws2 = wb.create_sheet('Historique Journalier')
ws2.row_dimensions[1].height = 28

note2 = ws2.cell(row=1, column=1,
    value='Alternative : donnees journalieres — plus de lignes mais meme resultat')
note2.font = Font(bold=True, color='1E40AF', size=10, name='Arial')
note2.fill = PatternFill('solid', start_color='DBEAFE')
ws2.merge_cells('A1:C1')
note2.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')

for i, (h, w) in enumerate([('date', 14), ('quantite', 14), ('article', 20)], 1):
    hdr(ws2, i, 2, h, w)

row2 = 3
# Seulement 2023-2024 en journalier pour ne pas trop alourdir
daily_products = products[:8]  # 8 produits phares

for yr in [2023, 2024]:
    for mo in range(1, 13):
        sf   = season(mo)
        days = 28 if mo == 2 else (30 if mo in [4,6,9,11] else 31)
        nb_transactions = max(4, days // 7)  # ~4 transactions par mois

        for code, name, qmin, qmax in daily_products:
            trend = 1.0 + 0.05 * (yr - 2023)
            monthly_total = random.uniform(qmin, qmax) * sf * trend
            # Repartir en nb_transactions journalieres
            for _ in range(nb_transactions):
                day = random.randint(1, days)
                qty = round(monthly_total / nb_transactions * random.uniform(0.7, 1.3))
                d   = date(yr, mo, day)
                bg  = ROW_BG1 if row2 % 2 == 0 else ROW_BG2
                put(ws2, row2, 1, d, bg=bg, fmt='DD/MM/YYYY')
                put(ws2, row2, 2, qty, bg=bg)
                put(ws2, row2, 3, code, bg=bg)
                row2 += 1

ws2.freeze_panes = 'A3'
ws2.auto_filter.ref = f'A2:C{row2-1}'
print(f'Onglet 2 (Journalier) : {row2 - 3} lignes')

# ─── Onglet 3 : Guide ──────────────────────────────────────────
ws3 = wb.create_sheet('GUIDE UTILISATION')
ws3.column_dimensions['A'].width = 55
ws3.column_dimensions['B'].width = 35

steps = [
    ('ETAPE 1 — Demarrer le service Python', 'cd ml && uvicorn main:app --reload --port 8001'),
    ('ETAPE 2 — Aller sur le Dashboard', 'Page Dashboard > Section "Prevision IA"'),
    ('ETAPE 3 — Cliquer "Entrainer le modele IA"', 'Bouton en haut a droite du Dashboard'),
    ('ETAPE 4 — Uploader CE fichier', 'Selectionner historique_ml_training.xlsx'),
    ('ETAPE 5 — Attendre confirmation', 'Message de succes avec metriques R2, RMSE, MAE'),
    ('ETAPE 6 — Voir les previsions', 'Le Dashboard affiche la demande prevue pour 2026-2027'),
]

ws3.cell(row=1, column=1, value='GUIDE UTILISATION DU FICHIER ML TRAINING').font = Font(bold=True, size=13, name='Arial')
ws3.merge_cells('A1:B1')

for i, (h, w) in enumerate([('Etape', 55), ('Action / Commande', 35)], 1):
    hdr(ws3, i, 2, h, w)

for r, (step, action) in enumerate(steps, 3):
    c1 = ws3.cell(row=r, column=1, value=step)
    c2 = ws3.cell(row=r, column=2, value=action)
    for c in [c1, c2]:
        c.font = Font(name='Arial', size=10)
        c.border = border
        c.alignment = Alignment(wrap_text=True, vertical='center')
    c1.fill = PatternFill('solid', start_color='FFF7ED')
    c2.fill = PatternFill('solid', start_color='F8FAFC')
    ws3.row_dimensions[r].height = 22

path = os.path.join(output_dir, 'historique_ml_training.xlsx')
wb.save(path)
print(f'\nFICHIER SAUVEGARDE : {path}')
print(f'Taille : 3 onglets')
print(f'  - "Historique Mensuel (pour ML)" : utiliser cet onglet pour l entrainement')
print(f'  - "Historique Journalier"         : alternative plus granulaire')
print(f'  - "GUIDE UTILISATION"             : instructions pas a pas')
