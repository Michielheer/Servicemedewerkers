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

# Hulpfunctie voor vuilgraad visualisatie
def vuilgraad_visualisatie(vuilgraad_label):
    if vuilgraad_label == "Schoon":
        return "🟢 Schoon"
    elif vuilgraad_label == "Licht vervuild":
        return "🟡 Licht vervuild" 
    else:
        return "🔴 Sterk vervuild"

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
        self.cell(0, 10, f'Pagina {self.page_no()}/{{nb}} - © Lavans - {date.today().strftime("%d-%m-%Y")}', 0, 0, 'C')
    
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
    lavans_logo_path = "Logo-Lavans-png.png"
    if os.path.exists(lavans_logo_path):
        logo_b64 = get_image_base64(lavans_logo_path)
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

# Maak een mapping van RelatiesImport waarbij voorloopnullen worden verwijderd en alles string is
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
        contact_naam = st.text_input("Naam contactpersoon", naam.strip())
        contact_email = st.text_input("E-mailadres contactpersoon", email[:-1].strip())
    else:
        contact_naam = st.text_input("Naam contactpersoon", geselecteerd.strip())
        contact_email = st.text_input("E-mailadres contactpersoon", "")

# --- Abonnementen ophalen ---
abon_data = supabase.table("abonnementen").select("*").eq("relatienummer", relatienummer).execute().data
matten_abos = [a for a in abon_data if a.get("activiteit", "").lower() == "matten"]
wissers_abos = [a for a in abon_data if a.get("activiteit", "").lower() == "wissers"]

# Haal alle relevante productnummers op
productnummers = list({a["productnummer"] for a in matten_abos + wissers_abos if a.get("productnummer")})
producten = supabase.table("product_catalogus").select("*").in_("productnummer", productnummers).execute().data
product_map = {p["productnummer"]: p for p in producten}

# Functie voor voorbeeld afdelingen en ligplaatsen
def get_voorbeeld_locaties():
    return [
        {"afdeling": "Algemeen", "ligplaats": "Algemeen"},
        {"afdeling": "Algemeen", "ligplaats": "BIJ KANTOOR 2X"},
        {"afdeling": "Algemeen", "ligplaats": "VIA KANTOOR = PRIVÉ"},
        {"afdeling": "Algemeen", "ligplaats": "BOUWKEET"},
        {"afdeling": "Kantoor", "ligplaats": "Ingang"},
        {"afdeling": "Loods", "ligplaats": "1x kantoor+ 1x deur naast kantoor"},
        {"afdeling": "Algemeen", "ligplaats": "Achter"},
        {"afdeling": "Hoofdgebouw", "ligplaats": "Zijdeur toiletruimte bij poetshok"},
        {"afdeling": "Hoofdgebouw", "ligplaats": "Hoofdingang+ gang kantoor naar loods"},
        {"afdeling": "Toiletruimtes+ kantoor na hygiëne sluis", "ligplaats": "2x toiletruimtes + 1x kantoor na hygiëne sluis"},
        {"afdeling": "Kleedruimte", "ligplaats": "Hoofdingang"},
        {"afdeling": "Algemeen", "ligplaats": "1 X RECHTS IN KANTOOR 1 X LINKS ACHTER"},
        {"afdeling": "Algemeen", "ligplaats": "HAL J KANTOREN ETD"},
        {"afdeling": "Algemeen", "ligplaats": "GEBOUW E INGANG PLOEGBAAS"}
    ]

# Voeg locatie-informatie toe aan abonnementen
for abo in matten_abos:
    aantal = int(abo.get("aantal", 1))
    # Check of afdeling en ligplaats direct in het abonnement zitten
    if "afdeling" in abo and "ligplaats" in abo:
        abo["ligplaatsen"] = [{"afdeling": abo["afdeling"], "ligplaats": abo["ligplaats"], "aantal": aantal}]
    else:
        # Anders gebruik standaardwaarde
        abo["ligplaatsen"] = [{"afdeling": "Algemeen", "ligplaats": "Algemeen", "aantal": aantal}]

# --- Voeg tabs toe voor formulier en rapportage ---
form_tab, report_tab = st.tabs(["📝 Inspectieformulier", "📊 Rapportage"])

with form_tab:
    # --- Eén inspecteur en datum bovenaan ---
    st.markdown("---")
    st.subheader("Inspectiegegevens")
    inspecteur_naam = st.text_input("Naam inspecteur / chauffeur", value="Roberto")
    inspectie_datum = st.date_input("Datum bezoek", date.today())

    # --- Functie om alleen echte wissers te tellen ---
    def is_echte_wisser(product):
        frequentie = product.get('bezoekritme', None)
        return frequentie not in [None, '', 'none']

    # --- Hulpfunctie voor inspectieformulier ---
    def inspectieformulier(soort, abos, fotos_key):
        st.markdown(f"## Inspectieformulier {soort}")
        data = {}
        if soort == "Wissers":
            st.markdown("### 2.1 Zien we andere zaken staan?")
            andere_zaken = st.text_area("Zie je andere schoonmaakmiddelen staan? (Bezems, wissers van andere leveranciers, etc.)")
            data["andere_zaken"] = andere_zaken

            # Vraag altijd, ook als er geen wissers meer zijn
            st.markdown("### 2.2 Zijn er wissers gestopt?")
            gestopte_wissers = st.checkbox("Zijn er wissers gestopt sinds het laatste servicemoment?")
            data["gestopte_wissers"] = gestopte_wissers
            if gestopte_wissers:
                data["gestopte_wissers_info"] = st.text_area("Welke wissers zijn gestopt? (Vul artikel, stopdatum, ligplaats, is die weg, afbeelding, etc. in)")
                data["actie_ophaleen"] = st.radio("Is de wisser daadwerkelijk weg?", ["Ja", "Nee", "Weet niet"]) 
                if data["actie_ophaleen"] == "Nee":
                    data["actie_binnendienst"] = st.text_area("Actie: Vraag aan binnendienst of SM of de wisser toch echt niet gebruikt wordt. Anders ophaalopdracht aanmaken.")

            st.markdown("### 2.3 Aantal wissers tellen")
            st.info("Tel alle aanwezige wissers en vul per type en formaat het aantal in. Vergelijk dit met het abonnement.")
            wissers_types = [
                ("Industrial (Paars)", ["100 cm", "75 cm", "50 cm", "Handwisser"]),
                ("Light Use (Grijs)", ["100 cm", "75 cm", "50 cm", "Handwisser"]),
                ("Rood (Wederverkoper)", ["100 cm", "75 cm", "50 cm", "Handwisser"])
            ]
            data["wissers_telling"] = {}
            for wisser_type, formaten in wissers_types:
                st.markdown(f"**{wisser_type}**")
                for formaat in formaten:
                    aantal = st.number_input(f"Aantal {wisser_type} - {formaat}", min_value=0, value=0, step=1, key=f"{wisser_type}_{formaat}")
                    gebruikt = st.number_input(f"Waarvan gebruikt ({wisser_type} - {formaat})", min_value=0, value=0, step=1, key=f"{wisser_type}_{formaat}_gebruikt")
                    data["wissers_telling"][f"{wisser_type}_{formaat}"] = {"aantal": aantal, "gebruikt": gebruikt}
            data["wissers_telling_opmerking"] = st.text_area("Opmerking bij telling wissers (optioneel)")

            st.markdown("### 2.4 Stelen en toebehoren")
            st.info("Geef aan of alles nog in juiste staat is. Wat moet er vervangen worden?")
            accessoires = ["Standaard steel", "Dubbele wissersteel", "Telescoopsteel", "Bak", "Muursteun"]
            data["accessoires_vervangen"] = {}
            for acc in accessoires:
                vervangen = st.number_input(f"Aantal te vervangen: {acc}", min_value=0, value=0, step=1, key=f"vervang_{acc}")
                data["accessoires_vervangen"][acc] = vervangen
            data["accessoires_opmerking"] = st.text_area("Opmerking bij accessoires (optioneel)")

            st.markdown("### 2.5 Verbruik vuile wissers")
            aantal_vuil = st.number_input("Aantal vuile wissers bij wisselmoment", min_value=0, value=0, step=1, key="aantal_vuile_wissers")
            data["aantal_vuile_wissers"] = aantal_vuil
            data["verbruik_opmerking"] = st.text_area("Opmerking over verbruik (optioneel, alleen intern)")

            st.markdown("### 2.6 Ligplaats & afdeling")
            ligplaats_ok = st.radio("Is het duidelijk hoe de wisselplek is aangegeven?", ["Ja", "Nee"], key="ligplaats_ok")
            data["ligplaats_ok"] = ligplaats_ok
            data["ligplaats_opmerking"] = st.text_area("Opmerking bij ligplaats/afdeling (optioneel)")

            st.markdown("### 2.7 Optimaliseren wisselfrequentie")
            optimalisatie = st.radio("Is optimalisatie van de wisselfrequentie mogelijk?", ["Nee", "Ja, optimaliseren mogelijk"], key="optimalisatie_wissers")
            data["optimalisatie_wissers"] = optimalisatie
            if optimalisatie == "Ja, optimaliseren mogelijk":
                data["optimalisatie_toelichting"] = st.text_area("Toelichting optimalisatie (bespreek met klant, kosten blijven gelijk, etc.)")

            data["fotos"] = st.file_uploader("Upload foto's van wissers en accessoires", type=["jpg", "jpeg", "png"], accept_multiple_files=True, key=fotos_key)
            if data["fotos"]:
                st.success(f"{len(data['fotos'])} foto's geüpload")
            return data
        else:
            skip = st.radio(f"{soort} inspectie uitvoeren?", ["Ja", "Nee"], index=0, key=f"{soort}_skip") == "Nee"
            data = {"skip": skip}
            if skip:
                data["skip_reden"] = st.text_area(f"Reden voor overslaan van {soort.lower()} inspectie", key=f"{soort}_skip_reden")
            else:
                data["frequentie_correct"] = st.radio("Klopt de frequentie?", ["Ja", "Nee"], index=0, key=f"{soort}_frequentie_correct") == "Ja"
                data["juiste_plek"] = st.radio(f"Liggen {soort.lower()} op de juiste plek?", ["Ja", "Nee"], index=0, key=f"{soort}_juiste_plek") == "Ja"
                if soort == "Wissers":
                    data["aanwezig"] = st.radio("Zijn de wissers aanwezig?", ["Ja", "Nee"], index=0, key="wissers_aanwezig") == "Ja"
                # --- Matten-specifiek: standaard en logomatten ---
                if soort == "Matten":
                    # Initialiseer matten vanuit abonnementen bij eerste keer
                    if 'matten_geïnitialiseerd' not in st.session_state:
                        st.session_state.standaard_matten_lijst = []
                        st.session_state.logomatten_lijst = []
                        
                        # Laat eerst alle informatie over de abonnementen zien
                        st.markdown("### Informatie uit abonnement")
                        for abo in abos:
                            mat_type = abo.get('productomschrijving', 'Onbekend')
                            aantal = int(abo.get('aantal', 1))
                            bezoekritme = abo.get('bezoekritme', '1-wekelijks')
                            afdeling = abo.get('afdeling', 'Algemeen')
                            ligplaats = abo.get('ligplaats', 'Algemeen')
                            
                            st.info(f"**{mat_type}** | Aantal: {aantal}, Frequentie: {bezoekritme} | Afdeling: {afdeling}, Ligplaats: {ligplaats}")
                            
                            # Maak voor elke mat in het abonnement een invoer
                            ligplaatsen = abo.get("ligplaatsen", [{"afdeling": afdeling, "ligplaats": ligplaats, "aantal": aantal}])
                            
                            for loc in ligplaatsen:
                                aantal_op_locatie = loc.get("aantal", 1)
                                loc_afdeling = loc.get("afdeling", afdeling)
                                loc_ligplaats = loc.get("ligplaats", ligplaats)
                                
                                # Maak voor elke mat op deze locatie een invoer
                                for i in range(aantal_op_locatie):
                                    mat_entry = {
                                        "afdeling": loc_afdeling,
                                        "ligplaats": loc_ligplaats,
                                        "mat_type": mat_type,
                                        "aantal": 1,  # 1 per invoer
                                        "bezoekritme": bezoekritme,
                                        "schoon_onbeschadigd": True,
                                        "vuilgraad_label": "Licht vervuild",
                                        "aanwezig": True,
                                        "abo_ref": abo  # Referentie naar het abonnement
                                    }
                                    
                                    # Bepaal of het een standaard mat of logomat is
                                    if "effektmat" in mat_type.lower():
                                        st.session_state.standaard_matten_lijst.append(mat_entry)
                                    else:
                                        mat_entry["barcode"] = ""  # Voeg barcodeveld toe voor logomatten
                                        st.session_state.logomatten_lijst.append(mat_entry)
                    
                    st.session_state.matten_geïnitialiseerd = True
                
                # Verzamel alle unieke afdelingen en ligplaatsen uit de abonnementen
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
                # Voeg ook alle reeds gekozen waarden toe
                for mat in st.session_state.standaard_matten_lijst + st.session_state.logomatten_lijst:
                    abonnement_afdelingen.add(mat.get('afdeling', ''))
                    abonnement_ligplaatsen.add(mat.get('ligplaats', ''))
                # Voeg voorbeeldlocaties toe
                for loc in get_voorbeeld_locaties():
                    abonnement_afdelingen.add(loc["afdeling"])
                    abonnement_ligplaatsen.add(loc["ligplaats"])
                # Maak gesorteerde lijsten
                afdelingen = sorted([a for a in abonnement_afdelingen if a])
                ligplaatsen = sorted([l for l in abonnement_ligplaatsen if l])
                
                # Nieuwe interface met tabs voor standaard matten en logomatten
                standaard_tab, logo_tab = st.tabs(["Standaard Matten (Effektmatten)", "Logomatten"])
                
                # Standaard matten tab
                with standaard_tab:
                    st.markdown("### Standaard matten")
                    
                    # Verwijder knoppen voor toevoegen/verwijderen
                    # Maak vooraf standaard matten aan op basis van abonnementen als dit nog niet is gebeurd
                    if 'matten_geïnitialiseerd' not in st.session_state:
                        st.session_state.standaard_matten_lijst = []
                        st.session_state.logomatten_lijst = []
                        
                        # Laat eerst alle informatie over de abonnementen zien
                        st.markdown("### Informatie uit abonnement")
                        for abo in abos:
                            mat_type = abo.get('productomschrijving', 'Onbekend')
                            aantal = int(abo.get('aantal', 1))
                            bezoekritme = abo.get('bezoekritme', '1-wekelijks')
                            afdeling = abo.get('afdeling', 'Algemeen')
                            ligplaats = abo.get('ligplaats', 'Algemeen')
                            
                            st.info(f"**{mat_type}** | Aantal: {aantal}, Frequentie: {bezoekritme} | Afdeling: {afdeling}, Ligplaats: {ligplaats}")
                            
                            # Maak voor elke mat in het abonnement een invoer
                            ligplaatsen = abo.get("ligplaatsen", [{"afdeling": afdeling, "ligplaats": ligplaats, "aantal": aantal}])
                            
                            for loc in ligplaatsen:
                                aantal_op_locatie = loc.get("aantal", 1)
                                loc_afdeling = loc.get("afdeling", afdeling)
                                loc_ligplaats = loc.get("ligplaats", ligplaats)
                                
                                # Maak voor elke mat op deze locatie een invoer
                                for i in range(aantal_op_locatie):
                                    mat_entry = {
                                        "afdeling": loc_afdeling,
                                        "ligplaats": loc_ligplaats,
                                        "mat_type": mat_type,
                                        "aantal": 1,  # 1 per invoer
                                        "bezoekritme": bezoekritme,
                                        "schoon_onbeschadigd": True,
                                        "vuilgraad_label": "Licht vervuild",
                                        "aanwezig": True,
                                        "abo_ref": abo  # Referentie naar het abonnement
                                    }
                                    
                                    # Bepaal of het een standaard mat of logomat is
                                    if "effektmat" in mat_type.lower():
                                        st.session_state.standaard_matten_lijst.append(mat_entry)
                                    else:
                                        mat_entry["barcode"] = ""  # Voeg barcodeveld toe voor logomatten
                                        st.session_state.logomatten_lijst.append(mat_entry)
                        
                        st.session_state.matten_geïnitialiseerd = True
                    
                    # Check of er standaard matten zijn
                    if not st.session_state.standaard_matten_lijst:
                        st.info("Er zijn geen standaard matten (Effektmatten) in het abonnement gevonden.")
                    else:
                        # Tabulaire interface voor standaard matten
                        st.markdown("#### Registreer de status van alle standaard matten")
                        st.markdown("Bewerk de vuilgraad en status in deze tabel. Wijzigingen worden automatisch opgeslagen.")
                        
                        # Maak een dataframe met alle matten
                        mat_data = []
                        for i, mat in enumerate(st.session_state.standaard_matten_lijst):
                            mat_data.append({
                                "Productomschrijving": mat["mat_type"],
                                "Afdeling": mat["afdeling"],
                                "Ligplaats": mat["ligplaats"],
                                "Aanwezig": mat["aanwezig"],
                                "Schoon/onbeschadigd": mat["schoon_onbeschadigd"],
                                "Vuilgraad": mat.get("vuilgraad_label", "Licht vervuild")
                            })
                        
                        # Maak een dataframe
                        if mat_data:
                            df = pd.DataFrame(mat_data)
                            
                            # Reorganiseer de kolommen zodat Afdeling, Ligplaats, Productomschrijving vooraan staan
                            column_order = ["Afdeling", "Ligplaats", "Productomschrijving", "Vuilgraad", "Aanwezig", "Schoon/onbeschadigd"]
                            columns_to_use = [col for col in column_order if col in df.columns]
                            other_columns = [col for col in df.columns if col not in column_order]
                            final_column_order = columns_to_use + other_columns
                            
                            # Pas het dataframe aan met de nieuwe kolomvolgorde
                            df = df[final_column_order]
                            
                            # Maak een bewerker voor de tabel
                            edited_df = st.data_editor(
                                df,
                                column_config={
                                    "Productomschrijving": st.column_config.TextColumn("Productomschrijving", disabled=True),
                                    "Afdeling": st.column_config.SelectboxColumn("Afdeling", options=afdelingen, required=True),
                                    "Ligplaats": st.column_config.SelectboxColumn("Ligplaats", options=ligplaatsen, required=True),
                                    "Aanwezig": st.column_config.CheckboxColumn("Aanwezig"),
                                    "Schoon/onbeschadigd": st.column_config.CheckboxColumn("Schoon/onbeschadigd"),
                                    "Vuilgraad": st.column_config.SelectboxColumn("Vuilgraad", options=["Schoon", "Licht vervuild", "Sterk vervuild"], required=True)
                                },
                                hide_index=True,
                                num_rows="dynamic",
                                key="standaard_matten_editor"
                            )
                            
                            # Verwerk de wijzigingen in de session state
                            if edited_df is not None:
                                for i, row in edited_df.iterrows():
                                    mat = st.session_state.standaard_matten_lijst[i]
                                    mat["afdeling"] = row["Afdeling"]
                                    mat["ligplaats"] = row["Ligplaats"]
                                    mat["aanwezig"] = bool(row["Aanwezig"])
                                    mat["schoon_onbeschadigd"] = bool(row["Schoon/onbeschadigd"])
                                    mat["vuilgraad_label"] = row["Vuilgraad"]
                                    if row["Vuilgraad"] == "Schoon":
                                        mat["vuilgraad"] = 0
                                    elif row["Vuilgraad"] == "Licht vervuild":
                                        mat["vuilgraad"] = 1
                                    else:
                                        mat["vuilgraad"] = 2
                        
                        # Voeg een preview toe van hoe het in het rapport eruit zal zien
                        with st.expander("Voorbeeldweergave rapport"):
                            st.markdown("#### Standaard matten in rapport")
                            st.markdown("| Afdeling | Ligplaats | Schoon/heel | Vuilgraad |")
                            st.markdown("|----------|-----------|-------------|----------|")
                            for mat in st.session_state.standaard_matten_lijst:
                                if mat["aanwezig"]:
                                    vuilgraad_str = vuilgraad_visualisatie(mat.get('vuilgraad_label', 'Licht vervuild'))
                                    st.markdown(f"| {mat['afdeling']} | {mat['ligplaats']} | {'JA' if mat['schoon_onbeschadigd'] else 'NEE'} | {vuilgraad_str} |")
                
                # Logomatten tab
                with logo_tab:
                    st.markdown("### Logomatten")
                    
                    # Check of er logomatten zijn
                    if not st.session_state.logomatten_lijst:
                        st.info("Er zijn geen logomatten in het abonnement gevonden.")
                    else:
                        # Tabulaire interface voor logomatten
                        st.markdown("#### Registreer de status van alle logomatten")
                        st.markdown("Bewerk de vuilgraad en status in deze tabel. Wijzigingen worden automatisch opgeslagen.")
                        
                        # Maak een dataframe met alle logomatten
                        mat_data = []
                        
                        # Verwerk de lijst batchgewijs
                        for i, mat in enumerate(st.session_state.logomatten_lijst):
                            mat_data.append({
                                "Productomschrijving": mat["mat_type"],
                                "Afdeling": mat["afdeling"],
                                "Ligplaats": mat["ligplaats"],
                                "Barcode": mat.get("barcode", ""),
                                "Leeftijd": extract_mat_leeftijd(mat.get("barcode", "")) if mat.get("barcode") else "-",
                                "Aanwezig": mat["aanwezig"],
                                "Schoon/onbeschadigd": mat["schoon_onbeschadigd"],
                                "Vuilgraad": mat.get("vuilgraad_label", "Licht vervuild")
                            })
                        
                        # Maak een dataframe
                        if mat_data:
                            df = pd.DataFrame(mat_data)
                            
                            # Reorganiseer de kolommen zodat Afdeling, Ligplaats, Productomschrijving vooraan staan
                            column_order = ["Afdeling", "Ligplaats", "Productomschrijving", "Vuilgraad", "Barcode", "Leeftijd", "Aanwezig", "Schoon/onbeschadigd"]
                            columns_to_use = [col for col in column_order if col in df.columns]
                            other_columns = [col for col in df.columns if col not in column_order]
                            final_column_order = columns_to_use + other_columns
                            
                            # Pas het dataframe aan met de nieuwe kolomvolgorde
                            df = df[final_column_order]
                            
                            # Maak een bewerker voor de tabel
                            edited_df = st.data_editor(
                                df,
                                column_config={
                                    "Productomschrijving": st.column_config.TextColumn("Productomschrijving", disabled=True),
                                    "Afdeling": st.column_config.SelectboxColumn("Afdeling", options=afdelingen, required=True),
                                    "Ligplaats": st.column_config.SelectboxColumn("Ligplaats", options=ligplaatsen, required=True),
                                    "Barcode": st.column_config.TextColumn("Barcode"),
                                    "Leeftijd": st.column_config.TextColumn("Leeftijd", disabled=True),
                                    "Aanwezig": st.column_config.CheckboxColumn("Aanwezig"),
                                    "Schoon/onbeschadigd": st.column_config.CheckboxColumn("Schoon/onbeschadigd"),
                                    "Vuilgraad": st.column_config.SelectboxColumn("Vuilgraad", options=["Schoon", "Licht vervuild", "Sterk vervuild"], required=True)
                                },
                                hide_index=True,
                                num_rows="dynamic",
                                key="logomatten_editor"
                            )
                            
                            # Verwerk de wijzigingen in de session state
                            if edited_df is not None:
                                for i, row in edited_df.iterrows():
                                    mat = st.session_state.logomatten_lijst[i]
                                    mat["afdeling"] = row["Afdeling"]
                                    mat["ligplaats"] = row["Ligplaats"]
                                    mat["barcode"] = row["Barcode"]
                                    mat["aanwezig"] = bool(row["Aanwezig"])
                                    mat["schoon_onbeschadigd"] = bool(row["Schoon/onbeschadigd"])
                                    mat["vuilgraad_label"] = row["Vuilgraad"]
                                    if row["Vuilgraad"] == "Schoon":
                                        mat["vuilgraad"] = 0
                                    elif row["Vuilgraad"] == "Licht vervuild":
                                        mat["vuilgraad"] = 1
                                    else:
                                        mat["vuilgraad"] = 2
                        
                        # Voeg een preview toe van hoe het in het rapport eruit zal zien
                        with st.expander("Voorbeeldweergave rapport"):
                            st.markdown("#### Logomatten in rapport")
                            st.markdown("| Afdeling | Ligplaats | Barcode | Leeftijd | Schoon/heel | Vuilgraad |")
                            st.markdown("|----------|-----------|---------|----------|-------------|----------|")
                            for idx, mat in enumerate(st.session_state.logomatten_lijst):
                                if mat["aanwezig"]:
                                    barcode = mat.get('barcode', '-')
                                    leeftijd = extract_mat_leeftijd(barcode) if barcode and barcode != '-' else '-'
                                    vuilgraad_str = vuilgraad_visualisatie(mat.get('vuilgraad_label', 'Licht vervuild'))
                                    st.markdown(f"| {mat['afdeling']} | {mat['ligplaats']} | {barcode} | {leeftijd} | {'JA' if mat['schoon_onbeschadigd'] else 'NEE'} | {vuilgraad_str} |")
                        
                        # Sla de mattenlijsten op in data zodat ze in het rapport gebruikt kunnen worden
                        data["standaard_matten"] = st.session_state.standaard_matten_lijst.copy()
                        data["logomatten"] = st.session_state.logomatten_lijst.copy()
            return data

    # --- Gebruik inspectieformulier voor matten en wissers ---
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
        st.session_state.rapport_gegenereerd = True

    with report_tab:
        if st.session_state.get('rapport_gegenereerd', False):
            matten_data = st.session_state.get('matten_data', None)
            wissers_data = st.session_state.get('wissers_data', None)
            lavans_logo_path = "Logo-Lavans-png.png"
            if os.path.exists(lavans_logo_path):
                logo_b64 = get_image_base64(lavans_logo_path)
                logo_html = f'<img src="data:image/png;base64,{logo_b64}" style="max-width: 200px; margin-bottom: 20px;">'
            inspecteur_naam = st.session_state.get('inspecteur_naam', '')
            bedrijfsnaam = "Lavans"
            
            # Toon contactpersonen
            st.markdown("### Contactpersonen")
            if contactpersonen_lijst:
                for i, cp in enumerate(contactpersonen_lijst):
                    st.markdown(f"**Contactpersoon {i+1}:** {cp}")
            else:
                st.warning("Geen contactpersonen gevonden voor deze klant")
            
            # Toon beschikbare rapporten
            st.markdown("### Beschikbare rapporten")
            
            # Genereer klantrapport indien nodig
            klant_rapport = f"""
# Servicerapport Lavans

**Klant:** {klantnaam}  
**Relatienummer:** {relatienummer}  
**Datum rapport:** {date.today().strftime('%d-%m-%Y')}  
**Inspecteur:** {inspecteur_naam if inspecteur_naam else '-'}  
**Bedrijf:** {bedrijfsnaam}

---
"""
            # Voeg rest van rapportgeneratie code hier toe
            # ... [hier kan meer rapportage code komen]

            # AI-rapportage
            if os.getenv("OPENAI_API_KEY"):
                client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                ai_prompt = (
                    "Je bent een controlerende servicemedewerker van Lavans. "
                    "Schrijf een klantvriendelijk, duidelijk en positief servicerapport in het Nederlands, gericht aan de klant van Lavans, "
                    "op basis van deze inspectiegegevens:\n\n"
                    f"{klant_rapport}\n\n"
                    "Het rapport moet professioneel, helder en positief geformuleerd zijn, en geschreven zijn vanuit Lavans richting de klant. "
                    "Vermijd interne opmerkingen of technische details die niet relevant zijn voor de klant.\n\n"
                    f"Onderteken het rapport met de volledige naam van de inspecteur: '{inspecteur_naam}', en niet met een willekeurige naam of initialen."
                )
                try:
                    response = client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": ai_prompt}],
                        temperature=0.5,
                    )
                    ai_rapport = response.choices[0].message.content.strip()
                    if inspecteur_naam and inspecteur_naam not in ai_rapport:
                        if "Met vriendelijke groet," in ai_rapport:
                            ai_rapport = ai_rapport.replace("Met vriendelijke groet,", f"Met vriendelijke groet,\n\n{inspecteur_naam}")
                        else:
                            ai_rapport += f"\n\nMet vriendelijke groet,\n\n{inspecteur_naam}\nInspecteur bij Lavans"
                    
                    st.markdown("### AI-klantrapport")
                    if os.path.exists(lavans_logo_path):
                        st.markdown(logo_html, unsafe_allow_html=True)
                    st.markdown(ai_rapport)
                    
                    # Download opties
                    try:
                        pdf_ai_rapport = markdown_to_pdf(ai_rapport, f"AI-servicerapport {klantnaam}")
                        st.markdown(
                            get_download_link(
                                pdf_ai_rapport,
                                f"ai_klantrapport_{klantnaam}_{date.today().strftime('%Y%m%d')}.pdf",
                                "📄 AI-klantrapport Downloaden (PDF)",
                                is_pdf=True
                            ),
                            unsafe_allow_html=True
                        )
                    except Exception as e:
                        st.warning(f"PDF generatie mislukt: {e}. Probeer de HTML versie.")
                        ai_rapport_html = markdown_to_html(ai_rapport, f"AI-servicerapport {klantnaam}")
                        st.markdown(
                            get_download_link(
                                ai_rapport_html,
                                f"ai_klantrapport_{klantnaam}_{date.today().strftime('%Y%m%d')}.html",
                                "📄 AI-klantrapport Downloaden (HTML)"
                            ),
                            unsafe_allow_html=True
                        )
                except Exception as e:
                    st.warning(f"AI-rapportage mislukt: {e}")
            else:
                st.info("AI-rapportage niet beschikbaar (geen OpenAI API key gevonden).")

            # --- To-do lijst voor servicemedewerker ---
            st.markdown('### 📋 To-do lijst voor servicemedewerker')
            todos = []
            # Matten
            if matten_data:
                for mat in matten_data.get('standaard_matten', []):
                    if not mat.get('aanwezig', True):
                        todos.append(f"Mat ontbreekt: {mat.get('afdeling', '-')}, {mat.get('ligplaats', '-')}")
                    if not mat.get('schoon_onbeschadigd', True):
                        todos.append(f"Mat beschadigd of vies: {mat.get('afdeling', '-')}, {mat.get('ligplaats', '-')}")
                    if mat.get('vuilgraad_label') == 'Sterk vervuild':
                        todos.append(f"Mat sterk vervuild: {mat.get('afdeling', '-')}, {mat.get('ligplaats', '-')}")
                if matten_data.get('frequentie_correct', True) is False:
                    todos.append("Controleer of de wisselfrequentie van de matten aangepast moet worden.")
                if matten_data.get('juiste_plek', True) is False:
                    todos.append("Controleer of alle matten op de juiste plek liggen.")
                if matten_data.get('advies_vervangen_extra', False):
                    todos.append("Advies: matten vervangen of extra plaatsen.")
                if matten_data.get('opmerkingen'):
                    todos.append(f"Opmerking matten: {matten_data.get('opmerkingen')}")
            # Wissers
            if wissers_data:
                for wisser in wissers_data.get('wissers', []):
                    if not wisser.get('aanwezig', True):
                        todos.append(f"Wisser ontbreekt: {wisser.get('afdeling', '-')}, {wisser.get('ligplaats', '-')}")
                    if not wisser.get('schoon_onbeschadigd', True):
                        todos.append(f"Wisser beschadigd of vies: {wisser.get('afdeling', '-')}, {wisser.get('ligplaats', '-')}")
                    if wisser.get('vuilgraad_label') == 'Sterk vervuild':
                        todos.append(f"Wisser sterk vervuild: {wisser.get('afdeling', '-')}, {wisser.get('ligplaats', '-')}")
                if wissers_data.get('frequentie_correct', True) is False:
                    todos.append("Controleer of de wisselfrequentie van de wissers aangepast moet worden.")
                if wissers_data.get('juiste_plek', True) is False:
                    todos.append("Controleer of alle wissers op de juiste plek liggen.")
                if wissers_data.get('advies_vervangen_extra', False):
                    todos.append("Advies: wissers vervangen of extra plaatsen.")
                if wissers_data.get('opmerkingen'):
                    todos.append(f"Opmerking wissers: {wissers_data.get('opmerkingen')}")
            # Concurrentmatten
            if st.session_state.get('concurrent_matten', False):
                todos.append("Let op: er zijn matten van de concurrent gesignaleerd.")
                if st.session_state.get('concurrent_matten_opmerkingen'):
                    todos.append(f"Locatie/omschrijving concurrentmatten: {st.session_state.get('concurrent_matten_opmerkingen')}")
            # Toon de lijst
            if todos:
                for todo in todos:
                    st.markdown(f"- [ ] {todo}")
            else:
                st.success("Geen openstaande actiepunten gevonden!")
        else:
            st.info("Nog geen rapport gegenereerd. Gebruik het inspectieformulier om een rapport te maken.")

    # Footer
    st.markdown("---")
    st.markdown("© Lavans - Service App")

    st.write("Python executable:", sys.executable)
    st.write("OpenAI versie:", openai.__version__)
