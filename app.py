#!/usr/bin/env python3
"""
Lavans Service App - Ideaal Servicemoment
-----------------------------------------
Een Streamlit-app voor servicemedewerkers om inspecties voor 
"Matten" en "Wissers" te registreren.
"""

import streamlit as st
import datetime
import io
from datetime import date
import base64
import pandas as pd
import os
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI
import openai
import sys
from io import BytesIO
from fpdf import FPDF
import re
import hashlib
import smtplib
from email.message import EmailMessage
from datetime import datetime
import pytz

# Nederlandse tijdzone
nl_tz = pytz.timezone('Europe/Amsterdam')

# --- Hulpfuncties

def log_wijziging(relatienummer, klantnaam, soort_wijziging, productnummer, veld, oude_waarde, nieuwe_waarde, gewijzigd_door, opmerking=None):
    try:
        log_entry = {
            "relatienummer": str(relatienummer),
            "klantnaam": klantnaam,
            "soort_wijziging": soort_wijziging,
            "productnummer": productnummer,
            "veld": veld,
            "oude_waarde": str(oude_waarde),
            "nieuwe_waarde": str(nieuwe_waarde),
            "gewijzigd_door": gewijzigd_door,
            "status": "nieuw",
            "opmerking": opmerking,
            "gewijzigd_op": datetime.now(nl_tz).isoformat()
        }
        response = supabase.table("service_wijzigingen_log").insert(log_entry).execute()
        return True
    except Exception as e:
        st.error(f"Fout bij loggen van wijziging: {e}")
        return False

def vergelijk_en_log_wijzigingen(oud_data, nieuw_data, relatienummer, klantnaam, soort_wijziging, gewijzigd_door):
    try:
        for item in nieuw_data:
            productnummer = item.get('productnummer', '')
            for veld, nieuwe_waarde in item.items():
                oud_item = next((x for x in oud_data if x.get('productnummer') == productnummer), None)
                oude_waarde = oud_item.get(veld, '') if oud_item else ''
                if str(oude_waarde) != str(nieuwe_waarde):
                    log_wijziging(
                        relatienummer=relatienummer,
                        klantnaam=klantnaam,
                        soort_wijziging=soort_wijziging,
                        productnummer=productnummer,
                        veld=veld,
                        oude_waarde=oude_waarde,
                        nieuwe_waarde=nieuwe_waarde,
                        gewijzigd_door=gewijzigd_door
                    )
        return True
    except Exception as e:
        st.error(f"Fout bij vergelijken en loggen van wijzigingen: {e}")
        return False

def add_todo_action(text):
    if 'todo_list' not in st.session_state:
        st.session_state['todo_list'] = []
    if not any(todo['text'] == text for todo in st.session_state['todo_list']):
        st.session_state['todo_list'].append({"text": text, "done": False})

def vuilgraad_visualisatie(vuilgraad_label):
    if vuilgraad_label == "Schoon":
        return "🟢 Schoon"
    elif vuilgraad_label == "Licht vervuild":
        return "🟡 Licht vervuild" 
    else:
        return "🔴 Sterk vervuild"

def genereer_todo_list():
    if 'todo_list' not in st.session_state:
        st.session_state['todo_list'] = []
    # Matten (standaard en logo)
    for mat in st.session_state.get('standaard_matten_lijst', []) + st.session_state.get('logomatten_lijst', []):
        mat_naam = mat.get('mat_type', 'Onbekend')
        afdeling = mat.get('afdeling', '')
        ligplaats = mat.get('ligplaats', '')
        locatie = f" ({afdeling}, {ligplaats})" if afdeling or ligplaats else ""
        if not mat.get('aanwezig', False):
            add_todo_action(f"Controleer waarom mat '{mat_naam}'{locatie} niet aanwezig is.")
        if mat.get('aantal', 1) == 0:
            add_todo_action(f"Controleer of mat '{mat_naam}'{locatie} verwijderd moet worden.")
        if mat.get('vuilgraad_label', '') == 'Sterk vervuild':
            add_todo_action(f"Mat '{mat_naam}'{locatie} vervangen of reinigen (sterk vervuild).")
        if not mat.get('schoon_onbeschadigd', True):
            add_todo_action(f"Mat '{mat_naam}'{locatie} inspecteren op schade.")
        if mat.get('opmerking', '').strip():
            add_todo_action(f"Controleer opmerking bij mat '{mat_naam}'{locatie}: {mat['opmerking']}")
        if afdeling == 'Algemeen' and ligplaats == 'Algemeen':
            add_todo_action(f"Specificeer afdeling en ligplaats voor mat '{mat_naam}' (nu: Algemeen/Algemeen)")
        # Jaarcheck logomatten: alleen voor logomatten
        if 'barcode' in mat and mat.get('barcode') and mat_naam.lower().startswith('logo'):
            leeftijd_str = extract_mat_leeftijd(mat['barcode'])
            # Zoek naar 'jaar' in de string en pak het getal
            match = re.search(r'(\d+) jaar', leeftijd_str)
            if match and int(match.group(1)) >= 3:
                add_todo_action(f"Controleer logomat '{mat_naam}' (ouder dan 3 jaar)")

    # Wissers
    wissers_tabel = st.session_state.get('wissers_tabel', [])
    for wisser in wissers_tabel:
        wisser_type = wisser.get('Type wisser', 'Onbekend')
        if wisser.get('Aantal', 1) == 0:
            add_todo_action(f"Controleer of wisser van type '{wisser_type}' verwijderd moet worden.")
        if wisser.get('Opmerking', '').strip():
            add_todo_action(f"Controleer opmerking bij wisser van type '{wisser_type}': {wisser['Opmerking']}")

    # Toebehoren
    toebehoren_tabel = st.session_state.get('toebehoren_tabel', [])
    for acc in toebehoren_tabel:
        acc_type = acc.get('Type accessoire', 'Onbekend')
        aantal = acc.get('Aantal te vervangen', 0)
        if aantal > 0:
            add_todo_action(f"Vervang {aantal}x '{acc_type}' bij wissers.")
        if acc.get('Opmerking', '').strip():
            add_todo_action(f"Controleer opmerking bij toebehoren '{acc_type}': {acc['Opmerking']}")

def save_contact_wijzigingen(updated_df, relatienummer, gewijzigd_door="onbekend"):
    try:
        # Haal bestaande contactpersonen uit de database
        db_contacts = supabase.table("RelatiesImport").select("*").eq("Relatienummer", str(relatienummer)).execute().data
        db_emails = set([c.get("E-mailadres", "") for c in db_contacts if c.get("E-mailadres")])

        # E-mails in de huidige tabel
        table_emails = set(updated_df["E-mailadres"].dropna().astype(str))

        # 1. Toevoegen of wijzigen: alleen loggen
        for _, row in updated_df.iterrows():
            if not row["E-mailadres"]:
                continue  # sla lege rijen over
            log_entry = {
                "relatienummer": str(relatienummer),
                "email": row["E-mailadres"],
                "voornaam": row["Voornaam"],
                "tussenvoegsel": row["Tussenvoegsel"],
                "achternaam": row["Achternaam"],
                "functie": row["Functie"],
                "telefoonnummer": row["Telefoonnummer"],
                "klantenportaal_gebruikersnaam": row["Klantenportaal_gebruikersnaam"],
                "nog_in_dienst": row["Nog_in_dienst"],
                "actie": "toegevoegd_of_gewijzigd",
                "verwijderd_op": datetime.now(nl_tz).isoformat(),
                "verwijderd_door": gewijzigd_door
            }
            supabase.table("contactpersonen_log").insert(log_entry).execute()

        # 2. Verwijderen: alleen loggen
        to_delete = db_emails - table_emails
        for contact in db_contacts:
            email = contact.get("E-mailadres", "")
            if email in to_delete:
                log_entry = {
                    "relatienummer": str(relatienummer),
                    "email": email,
                    "voornaam": contact.get("Voornaam", ""),
                    "tussenvoegsel": contact.get("Tussenvoegsel", ""),
                    "achternaam": contact.get("Achternaam", ""),
                    "functie": contact.get("Functie", ""),
                    "telefoonnummer": contact.get("Telefoonnummer", ""),
                    "klantenportaal_gebruikersnaam": contact.get("Klantenportaal_gebruikersnaam", ""),
                    "nog_in_dienst": contact.get("Nog_in_dienst", True),
                    "actie": "verwijderd",
                    "verwijderd_op": datetime.now(nl_tz).isoformat(),
                    "verwijderd_door": gewijzigd_door
                }
                supabase.table("contactpersonen_log").insert(log_entry).execute()

        st.success("Alle wijzigingen zijn gelogd in contactpersonen_log!")
        return True
    except Exception as e:
        st.error(f"Loggen in database mislukt: {e}")
        return False

# --- Aangepaste PDF klasse ---
class LavansReport(FPDF):
    def __init__(self, title="Lavans Rapport"):
        super().__init__()
        self.title = title
        self.logo_path = "Logo-Lavans-png.png"
        self.set_auto_page_break(auto=True, margin=15)
        
    def header(self):
        # Logo
        if os.path.exists(self.logo_path):
            self.image(self.logo_path, 10, 8, 50)
        # Header titel
        self.set_font('Arial', 'B', 16)
        self.cell(0, 15, self.title, 0, 1, 'R')
        # Lijn onder de header
        self.ln(5)
        self.line(10, 25, 200, 25)
        self.ln(10)
        
    def footer(self):
        # Ga naar 1.5 cm van de onderkant
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        # Paginanummer en datum
        self.cell(0, 10, f'Pagina {self.page_no()}/{{nb}} - © Lavans - {datetime.now(nl_tz).strftime("%d-%m-%Y")}', 0, 0, 'C')
    
    def chapter_title(self, title):
        self.set_font('Arial', 'B', 14)
        self.set_text_color(30, 58, 138)  # Donkerblauw
        self.cell(0, 10, title, 0, 1, 'L')
        self.ln(4)
        
    def section_title(self, title):
        self.set_font('Arial', 'B', 12)
        self.set_text_color(30, 58, 138)  # Donkerblauw
        self.cell(0, 6, title, 0, 1, 'L')
        self.ln(3)
    
    def normal_text(self, txt):
        self.set_font('Arial', '', 11)
        self.set_text_color(0, 0, 0)
        # Verbeterde verwerking: splits op enkele en dubbele newlines
        paragraphs = txt.split('\n\n')
        for para in paragraphs:
            lines = para.split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                if line.startswith('- '):
                    self.cell(5)
                    self.multi_cell(0, 7, line[2:])
                elif line.startswith('[JA]') or line.startswith('[NEE]') or line.startswith('[INFO]') or line.startswith('LET OP') or line.startswith('OK'):
                    self.set_font('Arial', 'B', 11)
                    self.multi_cell(0, 7, line)
                    self.set_font('Arial', '', 11)
                else:
                    self.multi_cell(0, 7, line)
            self.ln(2)  # Extra witruimte tussen paragrafen

def markdown_to_pdf(markdown_text, title="Rapport"):
    """Converteer markdown-tekst naar een PDF-bestand."""
    pdf = LavansReport(title=title)
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Verwijder Markdown-formatting
    markdown_text = re.sub(r'\*\*(.*?)\*\*', r'\1', markdown_text)
    
    # Split in hoofdstukken en secties
    lines = markdown_text.split('\n')
    current_section = ""
    
    for line in lines:
        if line.startswith('# '):
            pdf.chapter_title(line[2:])
        elif line.startswith('## '):
            pdf.chapter_title(line[3:])
        elif line.startswith('### '):
            pdf.section_title(line[4:])
        else:
            # Verzamel tekst en geef het door aan normal_text
            current_section += line + "\n"
            if line.strip() == '' and current_section.strip() != '':
                pdf.normal_text(current_section.strip())
                current_section = ""
    
    # Laatste sectie toevoegen als er nog tekst is
    if current_section.strip() != '':
        pdf.normal_text(current_section.strip())
    
    # Return als bytes object, niet als string
    return pdf.output(dest='S').encode('latin1')

# --- Supabase initialisatie ---
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Configuratie
st.set_page_config(
    page_title="Lavans Service App",
    page_icon="🧹",
    layout="centered",
    initial_sidebar_state="expanded"
)

# Stijl aanpassingen
st.markdown("""
<style>
    .main .block-container {max-width: 800px; padding-top: 2rem;}
    h1, h2, h3 {color: #1E3A8A;}
    .stButton>button {width: 100%; background-color: #1E3A8A; color: white;}
    .stButton>button:hover {background-color: #2563EB;}
    .reportbox {
        background-color: #F3F4F6;
        padding: 20px;
        border-radius: 5px;
        margin-bottom: 20px;
    }
</style>
""", unsafe_allow_html=True)

# Hulpfuncties
def init_state():
    if 'klant' not in st.session_state:
        st.session_state.klant = ""
    if 'datum' not in st.session_state:
        st.session_state.datum = date.today()
    if 'chauffeur' not in st.session_state:
        st.session_state.chauffeur = ""
    if 'rapport_gegenereerd' not in st.session_state:
        st.session_state.rapport_gegenereerd = False
    if 'formulier_data' not in st.session_state:
        st.session_state.formulier_data = {}

def extract_mat_leeftijd(barcode):
    """Extracteer de leeftijd van de mat op basis van barcode (maand: pos 3-4, jaar: pos 5-6)."""
    barcode = str(barcode).strip()
    if not barcode or len(barcode) < 8:
        return "Onbekend (te kort)"
    try:
        maand = int(barcode[3:5])
        jaar = int(barcode[5:7])
        if maand < 1 or maand > 12:
            return f"Onbekend (maand {maand} ongeldig)"
        productie_datum = datetime.date(2000 + jaar, maand, 1)
        leeftijd_dagen = (datetime.date.today() - productie_datum).days
        leeftijd_maanden = leeftijd_dagen // 30
        if leeftijd_maanden < 0:
            return "Onbekend (toekomstige datum)"
        if leeftijd_maanden < 12:
            return f"{leeftijd_maanden} maanden"
        else:
            leeftijd_jaren = leeftijd_maanden // 12
            resterende_maanden = leeftijd_maanden % 12
            if resterende_maanden == 0:
                return f"{leeftijd_jaren} jaar"
            else:
                return f"{leeftijd_jaren} jaar en {resterende_maanden} maanden"
    except Exception as e:
        return f"Onbekend (fout: {e})"

def get_download_link(content, filename, text, is_pdf=False):
    """Genereer een downloadlink voor de gegeven inhoud."""
    if is_pdf:
        b64 = base64.b64encode(content).decode()
        href = f'<a href="data:application/pdf;base64,{b64}" download="{filename}">{text}</a>'
    else:
        b64 = base64.b64encode(content.encode()).decode()
        href = f'<a href="data:file/txt;base64,{b64}" download="{filename}">{text}</a>'
    return href

def get_image_base64(image_path):
    """Lees een afbeelding en converteer naar base64."""
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode()

def markdown_to_html(markdown_text, title="Rapport"):
    """Converteer markdown naar eenvoudige HTML met basis styling."""
    # Vervang Markdown headers
    html = markdown_text.replace("# ", "<h1>").replace("\n## ", "</h1><h2>").replace("\n### ", "</h2><h3>")
    html = html.replace("</h3><h2>", "</h3><h2>").replace("</h2><h1>", "</h2><h1>")
    if "<h1>" in html and "</h1>" not in html:
        html += "</h1>"
    if "<h2>" in html and "</h2>" not in html:
        html += "</h2>"
    if "<h3>" in html and "</h3>" not in html:
        html += "</h3>"
    
    # Vervang lijstitems en andere Markdown-elementen
    html = html.replace("\n- ", "<br>• ")
    html = html.replace("\n\n", "<br><br>")
    html = html.replace("**", "")  # Verwijder bold markers
    
    # Voeg basis HTML structuur toe
    logo_html = ""
    logo_path = "Logo-Lavans-png.png"
    if os.path.exists(logo_path):
        logo_b64 = get_image_base64(logo_path)
        logo_html = f'<img src="data:image/png;base64,{logo_b64}" style="max-width: 200px; margin-bottom: 20px;">'
    
    complete_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{title}</title>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
            h1, h2, h3 {{ color: #1E3A8A; }}
            .reportbox {{ background-color: #F3F4F6; padding: 20px; border-radius: 5px; margin-bottom: 20px; }}
            @media print {{
                body {{ max-width: 100%; }}
                .reportbox {{ border: 1px solid #ccc; }}
            }}
        </style>
    </head>
    <body>
        {logo_html}
        <div class="reportbox">
        {html}
        </div>
        <footer>
            <p>© Lavans - Servicerapport</p>
        </footer>
    </body>
    </html>
    """
    return complete_html

# --- Klantselectie ---
klanten_data = supabase.table("abonnementen").select("relatienummer, naam").execute().data
klanten_uniek = {str(k['relatienummer']): k['naam'] for k in klanten_data if k['relatienummer'] and k['naam']}

# Haal contactpersonen op uit RelatiesImport (let op hoofdletters en streepje)
relatieimport_data = supabase.table("RelatiesImport").select(
    "Relatienummer, Voornaam, Tussenvoegsel, Achternaam, E-mailadres"
).execute().data

relatie_map = {}
for r in relatieimport_data:
    relnr = str(r['Relatienummer']).lstrip('0')
    relatie_map[relnr] = r

klant_keuze = st.selectbox(
    "Kies klant (relatienummer - naam)",
    [f"{nr} - {naam}" for nr, naam in klanten_uniek.items()],
    key="klant_select"
)
relatienummer = int(klant_keuze.split(" - ")[0])
klantnaam = klanten_uniek[str(relatienummer)]

# Wanneer een klant wordt geselecteerd, sla de huidige datum en tijd op
if 'geselecteerde_klant' not in st.session_state or st.session_state.geselecteerde_klant != relatienummer:
    st.session_state.geselecteerde_klant = relatienummer
    st.session_state.bezoek_datum = datetime.now(nl_tz).date()
    st.session_state.bezoek_tijd = datetime.now(nl_tz).strftime("%H:%M")

# --- Abonnementen ophalen ---
abon_data = supabase.table("abonnementen").select("*").eq("relatienummer", relatienummer).execute().data
matten_abos = [a for a in abon_data if a.get("activiteit", "").lower() == "matten"]
wissers_abos = [a for a in abon_data if a.get("activiteit", "").lower() == "wissers"]

# Initialiseer de lijsten in session state
st.session_state.standaard_matten_lijst = []
st.session_state.logomatten_lijst = []

# Bouw de mattenlijsten op uit de abonnementen
for abo in matten_abos:
    productnummer = str(abo.get("productnummer", ""))
    mat_info = {
        "mat_type": abo.get("productomschrijving", ""),
        "afdeling": abo.get("afdeling", "Algemeen"),
        "ligplaats": abo.get("ligplaats", "Algemeen"),
        "aantal": abo.get("aantal", 0),
        "aanwezig": False,
        "schoon_onbeschadigd": True,
        "vuilgraad_label": "Licht vervuild",
        "vuilgraad": 1,
        "barcode": abo.get("barcode", ""),
        "bezoekritme": abo.get("bezoekritme", "")
    }
    if productnummer.startswith("00M"):
        st.session_state.standaard_matten_lijst.append(mat_info)
    elif productnummer.startswith("L"):
        st.session_state.logomatten_lijst.append(mat_info)

# Contactpersoon direct via relatienummer ophalen
contactpersonen_data = supabase.table("RelatiesImport").select("*").eq("Relatienummer", str(relatienummer)).execute().data
# Verwerk alle contactpersonen
contactpersonen_lijst = []
for contactpersoon in contactpersonen_data:
    voornaam = contactpersoon.get("Voornaam", "")
    tussen = contactpersoon.get("Tussenvoegsel", "") if contactpersoon.get("Tussenvoegsel") else ""
    achternaam = contactpersoon.get("Achternaam", "")
    email = contactpersoon.get("E-mailadres", "")
    contactp_str = f"{voornaam} {tussen} {achternaam}"
    if email:
        contactp_str += f" ({email})"
    contactpersonen_lijst.append(contactp_str)

# Maak een string met alle contactpersonen
contactpersoon_str = ", ".join(contactpersonen_lijst) if contactpersonen_lijst else "-"

# --- Voeg tabs toe voor formulier en rapportage ---
# Toon Inspectieformulier, To-do lijst én Contactpersoon aanpassing
tabs = ["📝 Inspectieformulier", "📝 To-do lijst", "👤 Contactpersoon aanpassing"]
form_tab, todo_tab, data_tab = st.tabs(tabs)

with form_tab:
    # --- Contactpersoon selectie als eerste vraag ---
    st.markdown("---")
    st.subheader("Contactpersoon")
    st.markdown("Wie heb je gesproken en gaat de samenvatting ontvangen?")
    # Optie om bestaande contactpersoon te kiezen of nieuwe toe te voegen
    contact_opties = contactpersonen_lijst + ["Nieuwe contactpersoon toevoegen..."]
    contactpersoon_index = st.selectbox(
        "Selecteer contactpersoon",
        contact_opties,
        key="contactpersoon_select"
    )

    nieuwe_contactpersoon = False
    if contactpersoon_index == "Nieuwe contactpersoon toevoegen...":
        nieuwe_contactpersoon = True
        contact_naam = st.text_input("Naam nieuwe contactpersoon")
        contact_email = st.text_input("E-mailadres nieuwe contactpersoon")
    else:
        # Haal naam en e-mail uit de string
        geselecteerd = contactpersoon_index
        if "(" in geselecteerd and geselecteerd.endswith(")"):
            naam, email = geselecteerd.rsplit("(", 1)
            contact_naam = st.text_input("Naam contactpersoon", value=naam.strip())
            contact_email = st.text_input("E-mailadres contactpersoon", value=email[:-1].strip())
        else:
            contact_naam = st.text_input("Naam contactpersoon", value=geselecteerd.strip())
            contact_email = st.text_input("E-mailadres contactpersoon")

    # --- Eén inspecteur en datum bovenaan ---
    st.markdown("---")
    st.subheader("Inspectiegegevens")
    inspecteur_naam = st.text_input("Service medewerker", value="Roberto")
    
    # Gebruik de opgeslagen datum en tijd als standaardwaarden
    col1, col2 = st.columns(2)
    with col1:
        inspectie_datum = st.date_input("Datum bezoek", value=st.session_state.get('bezoek_datum', date.today()))
    with col2:
        inspectie_tijd = st.text_input("Tijdstip bezoek", value=st.session_state.get('bezoek_tijd', datetime.now(nl_tz).strftime("%H:%M")))

    # Laatste bezoek altijd leeg
    laatste_bezoek = st.date_input("Laatste bezoek", value=None, key="laatste_bezoek")

    # Functie om alleen echte wissers te tellen
    def is_echte_wisser(product):
        frequentie = product.get('bezoekritme', None)
        return frequentie not in [None, '', 'none']

    # Hulpfunctie voor inspectieformulier
    def inspectieformulier(soort, abos, fotos_key):
        st.markdown(f"## Inspectieformulier {soort}")
        data = {}

        # Alleen bij matten de mattenvraag tonen
        if soort == "Matten":
            st.markdown("### 1.1 Zien we matten van de concurrent liggen?")
            andere_mat_aanwezig = st.radio("Zien we mat van de concurrent liggen?", ["Nee", "Ja"], key=f"andere_mat_aanwezig_{soort}")
            data["andere_mat_aanwezig"] = andere_mat_aanwezig
            if andere_mat_aanwezig == "Ja":
                concurrent_opties = ["CWS", "ELIS", "Quality Service", "Vendrig", "Mewa", "Anders namelijk:"]
                gekozen_concurrent = st.selectbox("Van welke concurrent?", concurrent_opties, key=f"andere_mat_concurrent_select_{soort}")
                if gekozen_concurrent == "Anders namelijk:":
                    andere_concurrent = st.text_input("Welke andere concurrent?", key=f"andere_mat_concurrent_anders_{soort}")
                    data["andere_mat_concurrent"] = andere_concurrent
                else:
                    data["andere_mat_concurrent"] = gekozen_concurrent
            else:
                data["andere_mat_concurrent"] = ""
            # Aantal andere matten (koop) blijft apart
            andere_mat_koop = st.number_input("Aantal andere matten (koop)", min_value=0, value=0, step=1, key=f"andere_mat_koop_{soort}")
            data["andere_mat_koop"] = andere_mat_koop

        if soort == "Wissers":
            # Vraag 2.1 bovenaan bij wissers
            st.markdown("### 2.1 Zien we wissers van concurrenten staan?")
            wissers_concurrent = st.radio("Zien we wissers van concurrenten staan?", ["Nee", "Ja"], key=f"wissers_concurrent_{soort}")
            data["wissers_concurrent"] = wissers_concurrent
            if wissers_concurrent == "Ja":
                data["wissers_concurrent_toelichting"] = st.text_input("Welke concurrent(en)?", key=f"wissers_concurrent_toelichting_{soort}")
            else:
                data["wissers_concurrent_toelichting"] = ""
            andere_zaken = st.text_area("Zie je andere schoonmaakmiddelen staan? (Bezems, wissers van andere leveranciers, etc.)", key=f"andere_zaken_{soort}")
            data["andere_zaken"] = andere_zaken

            # Verzamel alle afdelingen en ligplaatsen voor wissers
            wissers_afdelingen = set()
            wissers_ligplaatsen = set()
            for abo in abos:
                if 'afdeling' in abo and abo['afdeling']:
                    wissers_afdelingen.add(abo['afdeling'])
                if 'ligplaats' in abo and abo['ligplaats']:
                    wissers_ligplaatsen.add(abo['ligplaats'])
                for loc in abo.get('ligplaatsen', []):
                    if 'afdeling' in loc and loc['afdeling']:
                        wissers_afdelingen.add(loc['afdeling'])
                    if 'ligplaats' in loc and loc['ligplaats']:
                        wissers_ligplaatsen.add(loc['ligplaats'])
            afdelingen = sorted([a for a in wissers_afdelingen if a])
            ligplaatsen = sorted([l for l in wissers_ligplaatsen if l])

            # Wissers tabel (zelfde opzet als matten)
            st.markdown("### Wissers overzicht")
            wissers_data = []
            for wisser in wissers_abos:
                wissers_data.append({
                    "Type wisser": wisser.get("productomschrijving", ""),
                    "Aantal": wisser.get("aantal", 0),
                    "Aanwezig": False,
                    "Opmerking": ""
                })
            if wissers_data:
                wissers_df = pd.DataFrame(wissers_data)
                column_order = ["Type wisser", "Aantal", "Aanwezig", "Opmerking"]
                columns_to_use = [col for col in column_order if col in wissers_df.columns]
                other_columns = [col for col in wissers_df.columns if col not in column_order]
                final_column_order = columns_to_use + other_columns
                wissers_df = wissers_df[final_column_order]
                edited_wissers_df = st.data_editor(
                    wissers_df,
                    column_config={
                        "Type wisser": st.column_config.TextColumn("Type wisser", disabled=True),
                        "Aantal": st.column_config.NumberColumn("Aantal", min_value=0),
                        "Aanwezig": st.column_config.CheckboxColumn("Aanwezig"),
                        "Opmerking": st.column_config.TextColumn("Opmerking")
                    },
                    hide_index=True,
                    num_rows="dynamic",
                    key=f"wissers_tabel_{soort}"
                )
                data["wissers_tabel"] = edited_wissers_df.to_dict("records")

            return data
        else:
            # Begin met 1.2 omdat 1.1 al eerder is behandeld
            st.markdown("### 1.2 Zijn er matten uit het abonnement verwijderd (stopzetting)?")
            gestopte_matten = st.checkbox("Zijn er matten uit het abonnement verwijderd (stopzetting?)", key=f"gestopte_matten_{soort}")
            data["gestopte_matten"] = gestopte_matten
            if gestopte_matten:
                data["gestopte_matten_info"] = st.text_area("Welke matten zijn gestopt? (Vul artikel, stopdatum, ligplaats, is die weg, afbeelding, etc. in)", key=f"gestopte_matten_info_{soort}")
                data["actie_ophaleen_mat"] = st.radio("Is de mat daadwerkelijk weg?", ["Ja", "Nee", "Weet niet"], key=f"actie_ophaleen_mat_{soort}")
                if data["actie_ophaleen_mat"] == "Nee":
                    data["actie_binnendienst_mat"] = st.text_area("Actie: Vraag aan binnendienst of SM of de mat toch echt niet gebruikt wordt. Anders ophaalopdracht aanmaken.", key=f"actie_binnendienst_mat_{soort}")

            # Voor de data verzameling 
            matten_lijst = st.session_state.get('standaard_matten_lijst', []) + st.session_state.get('logomatten_lijst', [])
            # Controleer op algemene ligplaatsen en voeg toe aan data
            for i, mat in enumerate(matten_lijst):
                afdeling = mat.get('afdeling', '')
                ligplaats = mat.get('ligplaats', '')
                if afdeling == 'Algemeen' and ligplaats == 'Algemeen':
                    add_todo_action(f"Ligplaats controleren en aanpassen in TMS voor mat {i+1} (nu: Algemeen/Algemeen).")
            
            data['matten_lijst'] = matten_lijst
            data['matten_opmerking'] = st.text_area("Opmerkingen over matten/ligplaatsen (optioneel)", key=f"matten_opmerking_1_{soort}")

            # --- Tabel met standaardmatten en logomatten ---
            st.markdown("---")
            st.subheader("Overzicht en bewerking matten uit abonnement")
            
            # Verzamel alle afdelingen en ligplaatsen
            abonnement_afdelingen = set()
            abonnement_ligplaatsen = set()
            for abo in abos:
                if 'afdeling' in abo and abo['afdeling']:
                    abonnement_afdelingen.add(abo['afdeling'])
                if 'ligplaats' in abo and abo['ligplaats']:
                    abonnement_ligplaatsen.add(abo['ligplaats'])
                for loc in abo.get('ligplaatsen', []):
                    if 'afdeling' in loc and loc['afdeling']:
                        abonnement_afdelingen.add(loc['afdeling'])
                    if 'ligplaats' in loc and loc['ligplaats']:
                        abonnement_ligplaatsen.add(loc['ligplaats'])
            
            afdelingen = sorted([a for a in abonnement_afdelingen if a])
            ligplaatsen = sorted([l for l in abonnement_ligplaatsen if l])

            # Maak tabs voor standaard en logo matten
            if st.session_state.logomatten_lijst:
                if st.session_state.standaard_matten_lijst:
                    standaard_tab, logo_tab = st.tabs(["Standaard matten", "Logomatten"])
                else:
                    logo_tab, = st.tabs(["Logomatten"])
            else:
                standaard_tab, = st.tabs(["Standaard matten"])

            if st.session_state.standaard_matten_lijst:
                with standaard_tab:
                    st.markdown("#### Standaard matten")
                    mat_data = []
                    for i, mat in enumerate(st.session_state.standaard_matten_lijst):
                        mat_data.append({
                            "Productomschrijving": mat["mat_type"],
                            "Afdeling": mat["afdeling"],
                            "Ligplaats": mat["ligplaats"],
                            "Aantal": mat["aantal"],
                            "Aanwezig": False,
                            "Vuilgraad": ""
                        })
                    if mat_data:
                        df = pd.DataFrame(mat_data)
                        column_order = ["Afdeling", "Ligplaats", "Productomschrijving", "Aantal", "Vuilgraad", "Aanwezig"]
                        columns_to_use = [col for col in column_order if col in df.columns and col != "Schoon/onbeschadigd"]
                        other_columns = [col for col in df.columns if col not in column_order]
                        final_column_order = columns_to_use + other_columns
                        df = df[final_column_order]
                        edited_df = st.data_editor(
                            df,
                            column_config={
                                "Productomschrijving": st.column_config.TextColumn("Productomschrijving", disabled=True),
                                "Afdeling": st.column_config.SelectboxColumn("Afdeling", options=afdelingen, required=True),
                                "Ligplaats": st.column_config.SelectboxColumn("Ligplaats", options=ligplaatsen, required=True),
                                "Aantal": st.column_config.NumberColumn("Aantal", min_value=0),
                                "Aanwezig": st.column_config.CheckboxColumn("Aanwezig"),
                                "Vuilgraad": st.column_config.SelectboxColumn("Vuilgraad", options=["", "Schoon", "Licht vervuild", "Sterk vervuild"], required=True)
                            },
                            hide_index=True,
                            num_rows="dynamic",
                            key=f"standaard_matten_editor_{soort}"
                        )
                        if edited_df is not None:
                            for i, row in edited_df.iterrows():
                                mat = st.session_state.standaard_matten_lijst[i]
                                mat["afdeling"] = row["Afdeling"]
                                mat["ligplaats"] = row["Ligplaats"]
                                mat["aantal"] = row["Aantal"]
                                mat["aanwezig"] = bool(row["Aanwezig"])
                                mat["vuilgraad_label"] = row["Vuilgraad"]
                                if row["Vuilgraad"] == "Schoon":
                                    mat["vuilgraad"] = 0
                                elif row["Vuilgraad"] == "Licht vervuild":
                                    mat["vuilgraad"] = 1
                                else:
                                    mat["vuilgraad"] = 2

            if st.session_state.logomatten_lijst:
                with logo_tab:
                    st.markdown("#### Logomatten")
                    mat_data = []
                    for i, mat in enumerate(st.session_state.logomatten_lijst):
                        mat_data.append({
                            "Productomschrijving": mat["mat_type"],
                            "Afdeling": mat["afdeling"],
                            "Ligplaats": mat["ligplaats"],
                            "Barcode (eerste 7 cijfers)": mat.get("barcode", ""),
                            "Aantal": mat["aantal"],
                            "Aanwezig": False,
                            "Vuilgraad": mat.get("vuilgraad_label", "Licht vervuild")
                        })
                    if mat_data:
                        df = pd.DataFrame(mat_data)
                        # Leeftijd live berekenen uit barcode
                        df["Leeftijd"] = df["Barcode (eerste 7 cijfers)"].apply(lambda x: extract_mat_leeftijd(str(x)) if x else "-")
                        column_order = ["Afdeling", "Ligplaats", "Productomschrijving", "Vuilgraad", "Barcode (eerste 7 cijfers)", "Leeftijd", "Aantal", "Aanwezig"]
                        columns_to_use = [col for col in column_order if col in df.columns and col != "Schoon/onbeschadigd"]
                        other_columns = [col for col in df.columns if col not in column_order]
                        final_column_order = columns_to_use + other_columns
                        df = df[final_column_order]
                        edited_df = st.data_editor(
                            df,
                            column_config={
                                "Productomschrijving": st.column_config.TextColumn("Productomschrijving", disabled=True),
                                "Afdeling": st.column_config.SelectboxColumn("Afdeling", options=afdelingen, required=True),
                                "Ligplaats": st.column_config.SelectboxColumn("Ligplaats", options=ligplaatsen, required=True),
                                "Barcode (eerste 7 cijfers)": st.column_config.TextColumn("Barcode (eerste 7 cijfers)", help="Vul de eerste 7 cijfers in (bijv. 0200720 voor juni 2020)"),
                                "Leeftijd": st.column_config.TextColumn("Leeftijd", disabled=True),
                                "Aantal": st.column_config.NumberColumn("Aantal", min_value=0),
                                "Aanwezig": st.column_config.CheckboxColumn("Aanwezig"),
                                "Vuilgraad": st.column_config.SelectboxColumn("Vuilgraad", options=["Schoon", "Licht vervuild", "Sterk vervuild"], required=True)
                            },
                            hide_index=True,
                            num_rows="dynamic",
                            key=f"logomatten_editor_{soort}"
                        )
                        if edited_df is not None:
                            for i, row in edited_df.iterrows():
                                mat = st.session_state.logomatten_lijst[i]
                                mat["afdeling"] = row["Afdeling"]
                                mat["ligplaats"] = row["Ligplaats"]
                                mat["barcode"] = row["Barcode (eerste 7 cijfers)"]
                                mat["aantal"] = row["Aantal"]
                                mat["aanwezig"] = bool(row["Aanwezig"])
                                mat["vuilgraad_label"] = row["Vuilgraad"]
                                if row["Vuilgraad"] == "Schoon":
                                    mat["vuilgraad"] = 0
                                elif row["Vuilgraad"] == "Licht vervuild":
                                    mat["vuilgraad"] = 1
                                else:
                                    mat["vuilgraad"] = 2

            data['fotos'] = st.file_uploader("Upload foto's van matten en locaties", type=["jpg", "jpeg", "png"], accept_multiple_files=True, key=f"fotos_{soort}")
            if data['fotos']:
                st.success(f"{len(data['fotos'])} foto's geüpload")

            return data

    # Toon de vragenlijst als er geen laatste bezoek is of als het laatste bezoek meer dan 6 maanden geleden was
    if laatste_bezoek is None:
        # Als er nog geen laatste bezoek is, toon de vragenlijst
        matten_data = None
        wissers_data = None
        if matten_abos:
            matten_data = inspectieformulier("Matten", matten_abos, "matten_fotos")
        if wissers_abos:
            wissers_data = inspectieformulier("Wissers", wissers_abos, "wissers_fotos")
    elif laatste_bezoek > inspectie_datum:
        st.warning("De datum van het laatste bezoek ligt in de toekomst!")
    else:
        maanden_verschil = (inspectie_datum.year - laatste_bezoek.year) * 12 + (inspectie_datum.month - laatste_bezoek.month)
        if maanden_verschil < 6:
            st.success("Geen inspectie nodig, laatste bezoek was minder dan 6 maanden geleden.")
        else:
            # Toon de vragenlijst als het laatste bezoek meer dan 6 maanden geleden was
            matten_data = None
            wissers_data = None
            if matten_abos:
                matten_data = inspectieformulier("Matten", matten_abos, "matten_fotos")
            if wissers_abos:
                wissers_data = inspectieformulier("Wissers", wissers_abos, "wissers_fotos")

    if st.button("Genereer Rapport"):
        st.session_state.matten_data = matten_data
        st.session_state.wissers_data = wissers_data
        st.session_state.inspecteur_naam = inspecteur_naam
        st.session_state.inspectie_datum = inspectie_datum
        st.session_state.inspectie_tijd = inspectie_tijd
        st.session_state.rapport_gegenereerd = True
        genereer_todo_list()

    if st.button("Genereer To-do's op basis van huidige data"):
        st.session_state['todo_list'] = []  # Leegmaken, zodat alleen actuele to-do's blijven
        genereer_todo_list()

    if st.button("Sla alles op voor deze klant"):
        # Voor matten
        if matten_data:
            vergelijk_en_log_wijzigingen(
                oud_data=st.session_state.get('standaard_matten_lijst', []) + st.session_state.get('logomatten_lijst', []),
                nieuw_data=matten_data.get('matten_lijst', []),
                relatienummer=relatienummer,
                klantnaam=klantnaam,
                soort_wijziging='mat',
                gewijzigd_door=inspecteur_naam
            )
        
        # Voor wissers
        if wissers_data:
            vergelijk_en_log_wijzigingen(
                oud_data=st.session_state.get('wissers_tabel', []),
                nieuw_data=wissers_data.get('wissers_tabel', []),
                relatienummer=relatienummer,
                klantnaam=klantnaam,
                soort_wijziging='wisser',
                gewijzigd_door=inspecteur_naam
            )
        
        # Voor toebehoren
        if wissers_data:
            vergelijk_en_log_wijzigingen(
                oud_data=st.session_state.get('toebehoren_tabel', []),
                nieuw_data=wissers_data.get('toebehoren_tabel', []),
                relatienummer=relatienummer,
                klantnaam=klantnaam,
                soort_wijziging='toebehoren',
                gewijzigd_door=inspecteur_naam
            )
        
        st.success("Alle wijzigingen zijn gelogd!")

with todo_tab:
    st.header("To-do lijst voor servicemedewerkers")
    if 'todo_list' not in st.session_state:
        st.session_state['todo_list'] = []
    # Lijst tonen en interactief maken
    remove_indices = []
    for idx, todo in enumerate(st.session_state['todo_list']):
        cols = st.columns([0.08, 0.8, 0.12])
        checked = cols[0].checkbox("", value=todo["done"], key=f"todo_done_{idx}")
        text = cols[1].text_input("", value=todo["text"], key=f"todo_text_{idx}")
        remove = cols[2].button("🗑️", key=f"remove_todo_{idx}")
        st.session_state['todo_list'][idx]["done"] = checked
        st.session_state['todo_list'][idx]["text"] = text
        if remove:
            remove_indices.append(idx)
    # Verwijderen na de loop (anders indexfout)
    for idx in sorted(remove_indices, reverse=True):
        st.session_state['todo_list'].pop(idx)
    if not st.session_state['todo_list']:
        st.info("Nog geen to-do's toegevoegd.")

    # --- To-do klantenservice ---
    st.markdown("---")
    st.subheader("To-do klantenservice")
    if 'klantenservice_todo_list' not in st.session_state:
        st.session_state['klantenservice_todo_list'] = []
        # Voorbeeld placeholder
        st.session_state['klantenservice_todo_list'].append({"text": "Voorbeeld: Maak nieuwe contactpersoon aan in CRM.", "done": False})
    for idx, todo in enumerate(st.session_state['klantenservice_todo_list']):
        cols = st.columns([0.08, 0.8, 0.12])
        checked = cols[0].checkbox("", value=todo["done"], key=f"ks_todo_done_{idx}")
        text = cols[1].text_input("", value=todo["text"], key=f"ks_todo_text_{idx}")
        remove = cols[2].button("🗑️", key=f"ks_remove_todo_{idx}")
        st.session_state['klantenservice_todo_list'][idx]["done"] = checked
        st.session_state['klantenservice_todo_list'][idx]["text"] = text
        if remove:
            st.session_state['klantenservice_todo_list'].pop(idx)
    if not st.session_state['klantenservice_todo_list']:
        st.info("Nog geen to-do's voor klantenservice.")

def export_wijzigingen_log():
    """
    Exporteer de wijzigingen log als CSV
    """
    try:
        # Haal alle nieuwe wijzigingen op
        response = supabase.table("service_wijzigingen_log")\
            .select("*")\
            .eq("status", "nieuw")\
            .execute()
        
        if response.data:
            df = pd.DataFrame(response.data)
            
            # Genereer CSV
            csv = df.to_csv(index=False)
            
            # Maak downloadbare link
            st.download_button(
                label="Download wijzigingen log (CSV)",
                data=csv,
                file_name=f"wijzigingen_log_{datetime.now(nl_tz).strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv"
            )
            
            # Update status naar 'verwerkt'
            for id in df['id']:
                supabase.table("service_wijzigingen_log")\
                    .update({"status": "verwerkt"})\
                    .eq("id", id)\
                    .execute()
        else:
            st.info("Geen nieuwe wijzigingen om te exporteren.")
            
    except Exception as e:
        st.error(f"Fout bij exporteren van wijzigingen: {e}")

# Voeg een tabblad toe voor het exporteren van wijzigingen
with st.sidebar:
    st.markdown("---")
    st.subheader("Wijzigingen Log")
    export_wijzigingen_log()

# --- Contactpersoon aanpassing tabblad ---
with data_tab:
    st.header("Contactpersoon aanpassing")
    st.markdown("Controleer hieronder of de juiste contactpersonen in het systeem staan. Pas aan waar nodig.\nAls alles klopt, hoef je niets te doen.\n\n**Let op:** Zet 'Nog in dienst' uit als iemand niet meer actief is.")

    # --- Contactpersonenbeheer ---
    st.markdown("---")
    st.subheader("Contactpersonen overzicht")
    contactpersonen_df = pd.DataFrame(contactpersonen_data)
    # Verwijder ongewenste kolommen indien aanwezig
    kolommen_verwijderen = [
        "Functie", "functie", "Functiebeschrijving", "aanvullende functie omschrijving",
        "rol_gebruiker", "Rol gebruiker", "Rol_Bessliiser", "Rol_Beslisser",
        "Operationeel contact", "Operationeel Contact",
        "Financieel contact", "Financieel Contact",
        "Rol_gebruiker", "Rol_beslisser", "Operationeel_contact", "Financieel_contact", "Actief",
        "Relatie", "Functies", "Aanvullende_functie_omschrijving"
    ]
    for col in kolommen_verwijderen:
        if col in contactpersonen_df.columns:
            contactpersonen_df = contactpersonen_df.drop(columns=[col])
    if not contactpersonen_df.empty:
        if 'contactpersonen_df_orig' not in st.session_state:
            st.session_state['contactpersonen_df_orig'] = contactpersonen_df.copy()
        editable_df = st.data_editor(
            contactpersonen_df,
            column_config={
                "Voornaam": st.column_config.TextColumn("Voornaam"),
                "Tussenvoegsel": st.column_config.TextColumn("Tussenvoegsel"),
                "Achternaam": st.column_config.TextColumn("Achternaam"),
                "E-mailadres": st.column_config.TextColumn("E-mailadres"),
                "Telefoonnummer": st.column_config.TextColumn("Telefoonnummer"),
                "Klantenportaal_gebruikersnaam": st.column_config.TextColumn("Klantenportaal_gebruikersnaam"),
                "Nog_in_dienst": st.column_config.CheckboxColumn("Nog in dienst")
            },
            hide_index=True,
            num_rows="dynamic",
            key="contactpersonen_editor"
        )
        st.markdown("---")
        st.markdown("**Let op:** Alle wijzigingen worden pas gelogd als je op onderstaande knop drukt.")
        if st.button("Log wijzigingen naar klantenservice to-do", key="log_contact_wijzigingen"):
            orig = st.session_state['contactpersonen_df_orig']
            nieuw = editable_df
            if 'klantenservice_todo_list' not in st.session_state:
                st.session_state['klantenservice_todo_list'] = []
            orig_emails = set(orig['E-mailadres'].dropna())
            nieuw_emails = set(nieuw['E-mailadres'].dropna())
            # Toegevoegd
            for email in nieuw_emails - orig_emails:
                row = nieuw[nieuw['E-mailadres'] == email].iloc[0]
                summary = f"Contactpersoon toegevoegd (email: {email}):\n"
                for col in nieuw.columns:
                    summary += f"- {col}: {row[col]}\n"
                st.session_state['klantenservice_todo_list'].append({"text": summary, "done": False})
                # Extra check: klantportaal gebruikersnaam ontbreekt
                gebruikersnaam = row.get('Klantenportaal_gebruikersnaam', None)
                if not gebruikersnaam or str(gebruikersnaam).strip().lower() in ['none', '']:
                    st.session_state['klantenservice_todo_list'].append({
                        "text": f"Uitnodigen klantportaal voor {email}",
                        "done": False
                    })
            # Verwijderd
            for email in orig_emails - nieuw_emails:
                row = orig[orig['E-mailadres'] == email].iloc[0]
                summary = f"Contactpersoon verwijderd (email: {email}):\n"
                for col in orig.columns:
                    summary += f"- {col}: {row[col]}\n"
                st.session_state['klantenservice_todo_list'].append({"text": summary, "done": False})
                # Extra check: klantportaal gebruikersnaam ontbreekt
                gebruikersnaam = row.get('Klantenportaal_gebruikersnaam', None)
                if not gebruikersnaam or str(gebruikersnaam).strip().lower() in ['none', '']:
                    st.session_state['klantenservice_todo_list'].append({
                        "text": f"Uitnodigen klantportaal voor {email}",
                        "done": False
                    })
            # Gewijzigd
            for email in nieuw_emails & orig_emails:
                row_orig = orig[orig['E-mailadres'] == email].iloc[0]
                row_nieuw = nieuw[nieuw['E-mailadres'] == email].iloc[0]
                wijzigingen = []
                for col in nieuw.columns:
                    if str(row_orig[col]) != str(row_nieuw[col]):
                        wijzigingen.append(f"- {col}: {row_orig[col]} → {row_nieuw[col]}")
                if wijzigingen:
                    summary = f"Contactpersoon gewijzigd (email: {email}):\n" + "\n".join(wijzigingen)
                    st.session_state['klantenservice_todo_list'].append({"text": summary, "done": False})
                    # Extra check: klantportaal gebruikersnaam ontbreekt
                    gebruikersnaam = row_nieuw.get('Klantenportaal_gebruikersnaam', None)
                    if not gebruikersnaam or str(gebruikersnaam).strip().lower() in ['none', '']:
                        st.session_state['klantenservice_todo_list'].append({
                            "text": f"Uitnodigen klantportaal voor {email}",
                            "done": False
                        })
            st.session_state['contactpersonen_df_orig'] = nieuw.copy()
            st.success("Wijzigingen gelogd en to-do's voor klantenservice toegevoegd!")
    else:
        st.info("Geen contactpersonen gevonden voor deze klant.")
