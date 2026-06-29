import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import date
import random
import os

random.seed(42)

output_dir = r'C:\Users\hamza\Desktop'

# Colors
HEADER_BG = '1E293B'
HEADER_FG = 'F1F5F9'
PO_BG     = 'D1FAE5'
SO_BG     = 'FEE2E2'
RM_BG     = 'FFF7ED'
FP_BG     = 'EDE9FE'
WARN_BG   = 'FEF2F2'

thin   = Side(style='thin', color='CBD5E1')
border = Border(left=thin, right=thin, top=thin, bottom=thin)

def hdr(ws, col, row, val, width=22):
    c = ws.cell(row=row, column=col, value=val)
    c.font      = Font(bold=True, color=HEADER_FG, name='Arial', size=10)
    c.fill      = PatternFill('solid', start_color=HEADER_BG)
    c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
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

# ── Raw materials (names must match RawMaterialSeeder exactly) ──
raw_materials = [
    ('Preform PET 5L',           40000, 80000,  0.045, 0.055),
    ('Preform PET 2L',           20000, 50000,  0.032, 0.038),
    ('Preform PET 1L',           10000, 30000,  0.022, 0.028),
    ('Bouchons Vissants 28mm',   80000,180000,  0.008, 0.012),
    ('Huile de Soja Brute',         80,   200, 1100,  1350 ),
    ('Huile de Palme Brute',        60,   150,  900,  1100 ),
    ('Huile de Tournesol Brute',    50,   130, 1200,  1450 ),
    ('Huile de Mais Brute',         30,    80, 1300,  1550 ),
    ('Lecithine de Soja',          500,  2000,  4.5,   6.0 ),
    ('Acide Citrique',             200,   800,  2.8,   3.5 ),
    ('Sel Raffine Alimentaire',    800,  3000,  0.4,   0.6 ),
    ('Moutarde en Poudre',         300,  1000,  5.5,   7.0 ),
    ('Poudre d Oeuf Entier',       200,   700, 12.0,  15.0 ),
    ('Etiquettes Adhesives',       200,   600,  8.5,  11.0 ),
    ('Cartons d Emballage',       5000, 15000,  1.2,   1.8 ),
]

# ── Finished products (user must create these in Products page) ──
finished_products = [
    ('Huile Vegetale 5L',              500,  2000, 8.5,  10.5),
    ('Huile Vegetale 2L',              300,  1200, 3.8,   4.8),
    ('Huile Vegetale 1L',              200,   800, 2.1,   2.7),
    ('Huile de Tournesol 5L',          400,  1500, 9.2,  11.5),
    ('Huile de Tournesol 2L',          250,   900, 4.2,   5.2),
    ('Huile de Mais 1L',               150,   600, 2.5,   3.2),
    ('Huile de Soja 5L',               200,   800, 8.8,  10.8),
    ('Margarine de Table 500g',        800,  3000, 1.8,   2.4),
    ('Margarine de Table 250g',        600,  2000, 1.0,   1.4),
    ('Margarine Professionnelle 1kg',  300,  1000, 3.5,   4.5),
    ('Margarine Feuilletage 2kg',      100,   400, 6.8,   8.5),
    ('Sauce Tomate 490g',              500,  2500, 1.5,   2.0),
    ('Sauce Harissa 380g',             400,  1800, 1.3,   1.8),
    ('Sauce Piquante 200ml',           200,   900, 0.9,   1.3),
    ('Mayonnaise Classique 490g',      600,  2500, 2.2,   2.9),
    ('Mayonnaise Legere 490g',         300,  1200, 2.4,   3.1),
    ('Mayonnaise a l Ail 300g',        200,   800, 1.8,   2.4),
]

def season_factor(month):
    if month in [6, 7, 8]:
        return 1.25
    if month in [11, 12, 1]:
        return 1.15
    return 1.0

# ═══════════════════════════════════════════════════════════════
# FICHIER 1 : historique_product_movements.xlsx
# ═══════════════════════════════════════════════════════════════
wb1 = openpyxl.Workbook()

# ── Sheet 1 : Achats Matières Premières (PO) ──
ws_po = wb1.active
ws_po.title = 'Achats Matieres Premieres (PO)'
ws_po.row_dimensions[1].height = 30

cols_mov = [('nom_produit',30),('type',8),('quantite',14),('date',14),('prix_unitaire',14)]
for i, (h, w) in enumerate(cols_mov, 1):
    hdr(ws_po, i, 1, h, w)

row = 2
for month_offset in range(24):
    yr = 2023 + month_offset // 12
    mo = (month_offset % 12) + 1
    sf = season_factor(mo)
    for name, qmin, qmax, pmin, pmax in raw_materials:
        d   = date(yr, mo, random.randint(2, 25))
        qty = round(random.uniform(qmin, qmax) * sf, 2)
        prc = round(random.uniform(pmin, pmax), 3)
        put(ws_po, row, 1, name, RM_BG)
        put(ws_po, row, 2, 'PO', PO_BG)
        put(ws_po, row, 3, qty)
        put(ws_po, row, 4, d, fmt='DD/MM/YYYY')
        put(ws_po, row, 5, prc)
        row += 1

ws_po.freeze_panes = 'A2'
ws_po.auto_filter.ref = 'A1:E' + str(row - 1)
print(f'Sheet PO : {row - 2} lignes')

# ── Sheet 2 : Ventes Produits Finis (SO) ──
ws_so = wb1.create_sheet('Ventes Produits Finis (SO)')
ws_so.row_dimensions[1].height = 30
for i, (h, w) in enumerate(cols_mov, 1):
    hdr(ws_so, i, 1, h, w)

row = 2
for month_offset in range(24):
    yr = 2023 + month_offset // 12
    mo = (month_offset % 12) + 1
    sf = season_factor(mo)
    for name, qmin, qmax, pmin, pmax in finished_products:
        nb_orders = random.randint(2, 4)
        for _ in range(nb_orders):
            d   = date(yr, mo, random.randint(1, 28))
            qty = round(random.uniform(qmin, qmax) * sf)
            prc = round(random.uniform(pmin, pmax), 2)
            put(ws_so, row, 1, name, FP_BG)
            put(ws_so, row, 2, 'SO', SO_BG)
            put(ws_so, row, 3, qty)
            put(ws_so, row, 4, d, fmt='DD/MM/YYYY')
            put(ws_so, row, 5, prc)
            row += 1

ws_so.freeze_panes = 'A2'
ws_so.auto_filter.ref = 'A1:E' + str(row - 1)
print(f'Sheet SO : {row - 2} lignes')

# ── Sheet 3 : Notice produits à créer ──
ws_notice = wb1.create_sheet('LIRE - Produits a creer')
ws_notice.row_dimensions[1].height = 45
ws_notice.column_dimensions['A'].width = 35
ws_notice.column_dimensions['B'].width = 20
ws_notice.column_dimensions['C'].width = 12
ws_notice.column_dimensions['D'].width = 12
ws_notice.column_dimensions['E'].width = 35

note = ws_notice.cell(row=1, column=1,
    value='IMPORTANT : Creer ces produits dans la page Products AVANT d importer l onglet Ventes Produits Finis')
note.font = Font(bold=True, color='DC2626', size=11, name='Arial')
note.fill = PatternFill('solid', start_color=WARN_BG)
ws_notice.merge_cells('A1:E1')
note.alignment = Alignment(wrap_text=True, vertical='center')

for i, (h, w) in enumerate([
    ('Nom exact (copier-coller)', 35),
    ('productType', 20),
    ('unit', 12),
    ('shelfLife', 12),
    ('code suggere', 18),
], 1):
    hdr(ws_notice, i, 2, h, w)

fp_notice = [
    ('Huile Vegetale 5L',             'FINISHED_PRODUCT', 'L',    365, 'HJ-VEG-5L'),
    ('Huile Vegetale 2L',             'FINISHED_PRODUCT', 'L',    365, 'HJ-VEG-2L'),
    ('Huile Vegetale 1L',             'FINISHED_PRODUCT', 'L',    365, 'HJ-VEG-1L'),
    ('Huile de Tournesol 5L',         'FINISHED_PRODUCT', 'L',    365, 'HJ-TRN-5L'),
    ('Huile de Tournesol 2L',         'FINISHED_PRODUCT', 'L',    365, 'HJ-TRN-2L'),
    ('Huile de Mais 1L',              'FINISHED_PRODUCT', 'L',    365, 'HJ-MAS-1L'),
    ('Huile de Soja 5L',              'FINISHED_PRODUCT', 'L',    365, 'HJ-SOJ-5L'),
    ('Margarine de Table 500g',       'FINISHED_PRODUCT', 'unite', 180, 'HJ-MAR-500'),
    ('Margarine de Table 250g',       'FINISHED_PRODUCT', 'unite', 180, 'HJ-MAR-250'),
    ('Margarine Professionnelle 1kg', 'FINISHED_PRODUCT', 'unite', 180, 'HJ-PRO-1KG'),
    ('Margarine Feuilletage 2kg',     'FINISHED_PRODUCT', 'unite', 180, 'HJ-FEU-2KG'),
    ('Sauce Tomate 490g',             'FINISHED_PRODUCT', 'unite', 730, 'HJ-SAT-490'),
    ('Sauce Harissa 380g',            'FINISHED_PRODUCT', 'unite', 730, 'HJ-SAH-380'),
    ('Sauce Piquante 200ml',          'FINISHED_PRODUCT', 'unite', 730, 'HJ-SAP-200'),
    ('Mayonnaise Classique 490g',     'FINISHED_PRODUCT', 'unite', 365, 'HJ-MAY-490'),
    ('Mayonnaise Legere 490g',        'FINISHED_PRODUCT', 'unite', 365, 'HJ-MAL-490'),
    ('Mayonnaise a l Ail 300g',       'FINISHED_PRODUCT', 'unite', 365, 'HJ-MAA-300'),
]
for r, row_data in enumerate(fp_notice, 3):
    put(ws_notice, r, 1, row_data[0], FP_BG)
    put(ws_notice, r, 2, row_data[1], PO_BG)
    put(ws_notice, r, 3, row_data[2])
    put(ws_notice, r, 4, row_data[3])
    put(ws_notice, r, 5, row_data[4])

path1 = os.path.join(output_dir, 'historique_product_movements.xlsx')
wb1.save(path1)
print(f'FICHIER 1 sauvegarde : {path1}')

# ═══════════════════════════════════════════════════════════════
# FICHIER 2 : historique_productions.xlsx
# ═══════════════════════════════════════════════════════════════
wb2 = openpyxl.Workbook()
ws_prod = wb2.active
ws_prod.title = 'Productions Realisees'
ws_prod.row_dimensions[1].height = 30

cols_prod = [
    ('nom_produit', 30),
    ('date',        14),
    ('quantite',    14),
    ('stock_dest',  22),
    ('operateur',   20),
    ('notes',       35),
]
for i, (h, w) in enumerate(cols_prod, 1):
    hdr(ws_prod, i, 1, h, w)

operators    = ['ahmed.haddar', 'sami.ben.ali', 'ibtihel.soltani', 'rami.trabelsi', 'nadia.chaari']
warehouses   = ['Entrepot Principal', 'Entrepot Froid', 'Entrepot B']
note_options = [
    'Production standard',
    'Production urgente - commande client',
    'Production lot exceptionnel',
    'Production hors planning',
    'Production normale planning mensuel',
    'Lot de rattrapage',
    'Production forte demande ete',
    'Production stock securite',
]

# Productions des produits finis sur 24 mois
prod_items = [
    ('Huile Vegetale 5L',             5000, 20000),
    ('Huile Vegetale 2L',             3000, 10000),
    ('Huile Vegetale 1L',             2000,  8000),
    ('Huile de Tournesol 5L',         4000, 15000),
    ('Huile de Tournesol 2L',         2000,  8000),
    ('Huile de Mais 1L',              1500,  6000),
    ('Huile de Soja 5L',              2000,  8000),
    ('Margarine de Table 500g',       8000, 30000),
    ('Margarine de Table 250g',       6000, 22000),
    ('Margarine Professionnelle 1kg', 3000, 10000),
    ('Margarine Feuilletage 2kg',     1000,  4000),
    ('Sauce Tomate 490g',             5000, 20000),
    ('Sauce Harissa 380g',            4000, 16000),
    ('Sauce Piquante 200ml',          2000,  8000),
    ('Mayonnaise Classique 490g',     6000, 24000),
    ('Mayonnaise Legere 490g',        3000, 12000),
    ('Mayonnaise a l Ail 300g',       2000,  8000),
]

row = 2
for month_offset in range(24):
    yr = 2023 + month_offset // 12
    mo = (month_offset % 12) + 1
    sf = season_factor(mo)

    for name, qmin, qmax in prod_items:
        # 1 ou 2 lots par mois par produit
        for batch in range(random.randint(1, 2)):
            day = random.randint(1, 28)
            d   = date(yr, mo, day)
            qty = round(random.uniform(qmin, qmax) * sf)
            op  = random.choice(operators)
            wh  = random.choice(warehouses)
            note = random.choice(note_options)
            put(ws_prod, row, 1, name, FP_BG)
            put(ws_prod, row, 2, d, fmt='DD/MM/YYYY')
            put(ws_prod, row, 3, qty)
            put(ws_prod, row, 4, wh)
            put(ws_prod, row, 5, op)
            put(ws_prod, row, 6, note)
            row += 1

ws_prod.freeze_panes = 'A2'
ws_prod.auto_filter.ref = 'A1:F' + str(row - 1)
print(f'Sheet Productions : {row - 2} lignes')

# ── Sheet 2 : Résumé mensuel ──
ws_sum = wb2.create_sheet('Resume Mensuel')
ws_sum.column_dimensions['A'].width = 25
ws_sum.column_dimensions['B'].width = 12
ws_sum.column_dimensions['C'].width = 18

for i, (h, w) in enumerate([('Produit',25),('Mois',12),('Total produit',18)], 1):
    hdr(ws_sum, i, 1, h, w)

row_s = 2
for name, qmin, qmax in prod_items:
    for month_offset in range(24):
        yr = 2023 + month_offset // 12
        mo = (month_offset % 12) + 1
        sf = season_factor(mo)
        total = round(random.uniform(qmin * 1.5, qmax * 1.8) * sf)
        put(ws_sum, row_s, 1, name, FP_BG)
        put(ws_sum, row_s, 2, f'{mo:02d}/{yr}')
        put(ws_sum, row_s, 3, total)
        row_s += 1

ws_sum.freeze_panes = 'A2'
ws_sum.auto_filter.ref = 'A1:C' + str(row_s - 1)

path2 = os.path.join(output_dir, 'historique_productions.xlsx')
wb2.save(path2)
print(f'FICHIER 2 sauvegarde : {path2}')
print()
print('=== RESUME ===')
print(f'historique_product_movements.xlsx')
print(f'  - Sheet "Achats Matieres Premieres (PO)" : 24 mois x 15 MP = 360 lignes')
print(f'  - Sheet "Ventes Produits Finis (SO)"     : 24 mois x 17 PF x 2-4 = ~1200-1600 lignes')
print(f'  - Sheet "LIRE - Produits a creer"        : 17 produits a creer dans Products')
print()
print(f'historique_productions.xlsx')
print(f'  - Sheet "Productions Realisees"          : ~{(row-2)} lignes (24 mois x 17 PF x 1-2 lots)')
print(f'  - Sheet "Resume Mensuel"                 : {17*24} lignes de totaux mensuels')
