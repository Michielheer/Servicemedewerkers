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

# Laad environment variables
load_dotenv()

# Supabase configuratie
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Hulpfuncties

def bereken_leeftijd(barcode):
    if not barcode or len(str(barcode)) < 7:
        return "-"
    try:
        barcode_str = str(barcode).strip()

        # Zorg ervoor dat de barcode lang genoeg is
        if len(barcode_str) >= 7:
            maand_digit = barcode_str[4]
            jaar_digits = barcode_str[5:7]

            st.write(f"[DEBUG] Maand digit: {maand_digit}, Jaar digits: {jaar_digits}")

            maand = int(maand_digit)
            jaar = int(jaar_digits)

            # Controleer maand en pas toe
            if maand < 1 or maand > 12:
                return f"Onbekend (maand {maand} ongeldig)"

            # Bereken het volledige jaar (20xx)
            volledig_jaar = 2000 + jaar

            productie_datum = datetime(volledig_jaar, maand, 1)
            vandaag = datetime.now()
            leeftijd_dagen = (vandaag - productie_datum).days
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
        else:
            return "Onbekend (te kort)"
    except Exception as e:
        st.write(f"[DEBUG] Fout: {e}")
        return f"Fout: {e}"

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
            leeftijd_str = bereken_leeftijd(mat['barcode'])
            # Zoek naar 'jaar' in de string en pak het getal
            match = re.search(r'(\d+) jaar', leeftijd_str)
            if match and int(match.group(1)) >= 3:
                add_todo_action(f"Controleer logomat '{mat_naam}' (ouder dan 3 jaar)")
                # Voeg ook een to-do toe voor de klantenservice
                if 'klantenservice_todo_list' not in st.session_state:
                    st.session_state['klantenservice_todo_list'] = []
                tekst = f"Logomat ouder dan 3 jaar bij klant '{mat_naam}': plan nieuwe logomat, check of logo gelijk is gebleven, geef aan dat je een nieuwe gaat bestellen."
                if not any(tekst in t["text"] for t in st.session_state['klantenservice_todo_list']):
                    st.session_state['klantenservice_todo_list'].append({
                        "text": tekst,
                        "done": False
                    })

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
    barcode = str(barcode).strip()
    st.write(f"[DEBUG] Barcode input: {barcode}")
    if not barcode or len(barcode) < 4:
        st.write("[DEBUG] Onbekend (te kort)")
        return "Onbekend (te kort)"
    try:
        barcode_str = str(barcode).strip()
        
        # Voor het formaat "0300522":
        # 03 = artikel/mat type (niet relevant voor datum)
        # 00 = niet relevant voor datum
        # 5 = mei (maand)
        # 22 = 2022 (jaar)
        
        # Haal het laatste cijfer op voor de maand (5)
        # en de laatste twee cijfers voor het jaar (22)
        if len(barcode_str) >= 3:
            maand_digit = barcode_str[-3]
            jaar_digits = barcode_str[-2:]
            
            maand = int(maand_digit)
            jaar = int(jaar_digits)
            
            # Controleer maand en pas toe
            if maand < 1 or maand > 12:
                return f"Onbekend (maand {maand} ongeldig)"
            
            # Bereken het volledige jaar (20xx)
            volledig_jaar = 2000 + jaar
            
            productie_datum = datetime.date(volledig_jaar, maand, 1)
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
        else:
            return "Onbekend (te kort)"
    except Exception as e:
        st.write(f"[DEBUG] Fout: {e}")
        return f"Onbekend (fout: {e})"
    
def log_inspectie_to_db(relatienummer, klantnaam, contactpersoon, contact_email, inspecteur, datum, tijd, matten_data, wissers_data):
    try:
        entry = {
            "relatienummer": relatienummer,
            "klantnaam": klantnaam,
            "contactpersoon": contactpersoon,
            "contact_email": contact_email,
            "inspecteur": inspecteur,
            "datum": str(datum),
            "tijd": tijd,
            "matten_data": matten_data,
            "wissers_data": wissers_data
        }
        supabase.table("service_inspecties").insert(entry).execute()
        st.success("Inspectie succesvol gelogd in database!")
    except Exception as e:
        st.error(f"Fout bij loggen inspectie: {e}")


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
tabs = ["📝 Inspectieformulier", "📝 To-do lijst", "👤 Contactpersoon aanpassing", "📊 Rapportage"]
form_tab, todo_tab, data_tab, rapportage_tab = st.tabs(tabs)

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

    # Verplaats de definitie van update_logomatten_editor naar boven de inspectieformulier functie
    def update_logomatten_editor():
        # Definieer afdelingen en ligplaatsen binnen de functie
        abonnement_afdelingen = set()
        abonnement_ligplaatsen = set()
        for mat in st.session_state.logomatten_lijst:
            if 'afdeling' in mat and mat['afdeling']:
                abonnement_afdelingen.add(mat['afdeling'])
            if 'ligplaats' in mat and mat['ligplaats']:
                abonnement_ligplaatsen.add(mat['ligplaats'])
        afdelingen = sorted([a for a in abonnement_afdelingen if a])
        ligplaatsen = sorted([l for l in abonnement_ligplaatsen if l])

        # Maak een DataFrame van de logomattenlijst
        logomatten_data = []
        for mat in st.session_state.logomatten_lijst:
            leeftijd = bereken_leeftijd(mat.get("barcode", ""))
            logomatten_data.append({
                "Productomschrijving": mat["mat_type"],
                "Afdeling": mat["afdeling"],
                "Ligplaats": mat["ligplaats"],
                "Barcode (eerste 7 cijfers)": mat.get("barcode", ""),
                "Aantal": mat["aantal"],
                "Aanwezig": mat["aanwezig"],
                "Vuilgraad": mat["vuilgraad_label"],
                "Leeftijd": leeftijd
            })

        # Maak een DataFrame
        df = pd.DataFrame(logomatten_data)
        column_order = ["Afdeling", "Ligplaats", "Productomschrijving", "Vuilgraad", "Barcode (eerste 7 cijfers)", "Leeftijd", "Aantal", "Aanwezig"]
        df = df[column_order]

        # Toon de data_editor met de dynamisch berekende "Leeftijd"-kolom
        edited_df = st.data_editor(
            df,
            column_config={
                "Productomschrijving": st.column_config.TextColumn("Productomschrijving", disabled=True),
                "Afdeling": st.column_config.SelectboxColumn("Afdeling", options=afdelingen, required=True),
                "Ligplaats": st.column_config.SelectboxColumn("Ligplaats", options=ligplaatsen, required=True),
                "Barcode (eerste 7 cijfers)": st.column_config.TextColumn(
                    "Barcode (eerste 7 cijfers)", 
                    help="Vul barcode in (bijv. 0300522 voor mei 2022, waarbij 5=mei en 22=jaar 2022)",
                    max_chars=7
                ),
                "Leeftijd": st.column_config.TextColumn("Leeftijd", disabled=True),
                "Aantal": st.column_config.NumberColumn("Aantal", min_value=0),
                "Aanwezig": st.column_config.CheckboxColumn("Aanwezig"),
                "Vuilgraad": st.column_config.SelectboxColumn("Vuilgraad", options=["Schoon", "Licht vervuild", "Sterk vervuild"], required=True)
            },
            hide_index=True,
            num_rows="dynamic",
            key="logomatten_editor"
        )

        # Update de logomattenlijst in session_state met de bewerkbare velden
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

    # Hulpfunctie voor inspectieformulier
    def inspectieformulier(soort, abos, fotos_key):
        st.markdown(f"## Inspectieformulier {soort}")
        data = {}

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

            # Tabel voor het aantal wissers
            st.markdown("### 2.3 Aantal wissers")
            wissers_data = []
            for wisser in abos:
                wissers_data.append({
                    "Artikel": wisser.get("productomschrijving", ""),
                    "Aantal geteld": 0,
                    "Waarvan gebruikt": 0
                })
            if wissers_data:
                wissers_df = pd.DataFrame(wissers_data)
                edited_wissers_df = st.data_editor(
                    wissers_df,
                    column_config={
                        "Artikel": st.column_config.TextColumn("Artikel", disabled=True),
                        "Aantal geteld": st.column_config.NumberColumn("Aantal geteld", min_value=0),
                        "Waarvan gebruikt": st.column_config.NumberColumn("Waarvan gebruikt", min_value=0)
                    },
                    hide_index=True,
                    num_rows="dynamic",
                    key=f"wissers_tabel_{soort}"
                )
                data["wissers_tabel"] = edited_wissers_df.to_dict("records")

            # Tabel voor toebehoren
            st.markdown("### 2.4 Stelen en toebehoren")
            toebehoren_data = []
            for acc in abos:
                toebehoren_data.append({
                    "Artikel": acc.get("productomschrijving", ""),
                    "Vervangen": False,
                    "Aantal": 0
                })
            if toebehoren_data:
                toebehoren_df = pd.DataFrame(toebehoren_data)
                edited_toebehoren_df = st.data_editor(
                    toebehoren_df,
                    column_config={
                        "Artikel": st.column_config.TextColumn("Artikel", disabled=True),
                        "Vervangen": st.column_config.CheckboxColumn("Vervangen"),
                        "Aantal": st.column_config.NumberColumn("Aantal", min_value=0)
                    },
                    hide_index=True,
                    num_rows="dynamic",
                    key=f"toebehoren_tabel_{soort}"
                )
                data["toebehoren_tabel"] = edited_toebehoren_df.to_dict("records")

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

        # --- Log inspectie in database ---
        log_inspectie_to_db(
            relatienummer=relatienummer,
            klantnaam=klantnaam,
            contactpersoon=contact_naam,
            contact_email=contact_email,
            inspecteur=inspecteur_naam,
            datum=inspectie_datum,
            tijd=inspectie_tijd,
            matten_data=matten_data,
            wissers_data=wissers_data
        )

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
            # Verwijderd
            for email in orig_emails - nieuw_emails:
                row = orig[orig['E-mailadres'] == email].iloc[0]
                summary = f"Contactpersoon verwijderd (email: {email}):\n"
                for col in orig.columns:
                    summary += f"- {col}: {row[col]}\n"
                st.session_state['klantenservice_todo_list'].append({"text": summary, "done": False})
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
            # Altijd: check klantportaal gebruikersnaam voor alle contactpersonen
            for i, row in nieuw.iterrows():
                gebruikersnaam = row.get('Klantenportaal_gebruikersnaam', None)
                email = row.get('E-mailadres', '')
                if not gebruikersnaam or str(gebruikersnaam).strip().lower() in ['none', '']:
                    # Voeg alleen toe als deze to-do nog niet bestaat
                    if not any(f"Uitnodigen klantportaal voor {email}" in t["text"] for t in st.session_state['klantenservice_todo_list']):
                        st.session_state['klantenservice_todo_list'].append({
                            "text": f"Uitnodigen klantportaal voor {email}",
                            "done": False
                        })
            st.session_state['contactpersonen_df_orig'] = nieuw.copy()
            st.success("Wijzigingen gelogd en to-do's voor klantenservice toegevoegd!")
        # Extra knop om alleen klantportaal to-do's te genereren
        if st.button("Genereer to-do's voor klantenservice", key="genereer_ks_todo"):
            nieuw = editable_df
            if 'klantenservice_todo_list' not in st.session_state:
                st.session_state['klantenservice_todo_list'] = []
            for i, row in nieuw.iterrows():
                gebruikersnaam = row.get('Klantenportaal_gebruikersnaam', None)
                email = row.get('E-mailadres', '')
                if not gebruikersnaam or str(gebruikersnaam).strip().lower() in ['none', '']:
                    if not any(f"Uitnodigen klantportaal voor {email}" in t["text"] for t in st.session_state['klantenservice_todo_list']):
                        st.session_state['klantenservice_todo_list'].append({
                            "text": f"Uitnodigen klantportaal voor {email}",
                            "done": False
                        })
            st.success("To-do's voor klantenservice gegenereerd!")
    else:
        st.info("Geen contactpersonen gevonden voor deze klant.")

# Voeg een nieuw tabblad toe voor rapportage
with rapportage_tab:
    st.header("Management Rapportage")

    # Haal gegevens op uit de database
    try:
        response = supabase.table("service_inspecties").select("*").execute()
        inspecties = response.data

        # Controleer of er gegevens zijn
        if inspecties:
            # Tel het aantal bezoeken
            totaal_bezoeken = len(inspecties)
            st.write(f"Totaal aantal bezoeken: {totaal_bezoeken}")

            # Voorbeeld: Aantal bezoeken per inspecteur
            inspecteur_data = {}
            for inspectie in inspecties:
                inspecteur = inspectie['inspecteur']
                if inspecteur in inspecteur_data:
                    inspecteur_data[inspecteur] += 1
                else:
                    inspecteur_data[inspecteur] = 1

            # Visualiseer het aantal bezoeken per inspecteur
            st.bar_chart(inspecteur_data)

        else:
            st.info("Geen inspectiegegevens beschikbaar.")

    except Exception as e:
        st.error(f"Fout bij ophalen van gegevens: {e}")

