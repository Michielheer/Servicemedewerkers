import streamlit as st
import pandas as pd
import os
import json
import random
from datetime import datetime
from fpdf import FPDF  # Installeer met: pip install fpdf
import hashlib
import base64
from io import BytesIO
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

# --- Login-scherm ---
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False
    st.session_state.username = ""

if not st.session_state.authenticated:
    st.title("Login")
    username = st.text_input("Gebruikersnaam", placeholder="Voer gebruikersnaam in")
    password = st.text_input("Wachtwoord", type="password", placeholder="Voer wachtwoord in")
    if st.button("Login"):
        # Verbeterde login met hashing (in een echte app zou je dit in een database opslaan)
        if username == "Tijn" and password == "Tijn":
            st.session_state.authenticated = True
            st.session_state.username = username
            st.success("Succesvol ingelogd!")
            st.rerun()
        else:
            st.info("Controleer je gebruikersnaam en wachtwoord en probeer opnieuw.")
    st.stop()

# --- Pagina configuratie ---
st.set_page_config(
    page_title="Lavans Service Checklist",
    page_icon="🚚",
    layout="centered",
    initial_sidebar_state="expanded"
)

# --- Dummy CRM-data ---
# Voor elke klant wordt vastgelegd welke producten van toepassing zijn en het aantal dispensers (voor sanitair bijvoorbeeld)
dummy_crm = {
    "Klant A": {
        "producten": ["Matten", "Wissers"],
        "aantal_dispensers": 5
    },
    "Klant B": {
        "producten": ["Sanitair", "Poetsdoeken"],
        "aantal_dispensers": 8
    },
    "Klant C": {
        "producten": ["Matten", "Sanitair", "Wissers", "Poetsdoeken"],
        "aantal_dispensers": 20
    }
}

# --- Sidebar Navigatie ---
if os.path.exists("Logo-Lavans-png.png"):
    st.sidebar.image("Logo-Lavans-png.png", use_column_width=True)
else:
    st.sidebar.image("https://via.placeholder.com/150x80?text=Lavans+Logo", use_column_width=True)
st.sidebar.title("Navigatie")
page = st.sidebar.radio("Ga naar:", ["Nieuwe checklist", "Overzicht checklists", "Mijn to-do lijst"], key="nav_radio")

# Maak een map voor foto's als deze nog niet bestaat
if not os.path.exists("uploads"):
    os.makedirs("uploads")

# --- Functies ---
def save_checklist(data):
    if not os.path.exists("checklists.csv"):
        df = pd.DataFrame([data])
        df.to_csv("checklists.csv", index=False)
    else:
        df = pd.DataFrame([data])
        df.to_csv("checklists.csv", mode="a", header=False, index=False)
    return True

def load_checklists():
    """Laad alle checklists uit het bestand"""
    if os.path.exists("checklists.csv"):
        try:
            # Lees eerst de headers om het juiste aantal kolommen te bepalen
            df = pd.read_csv("checklists.csv", nrows=1)
            num_columns = len(df.columns)
            
            # Lees het volledige bestand met het juiste aantal kolommen
            df = pd.read_csv("checklists.csv", on_bad_lines='skip')
            return df
        except Exception as e:
            st.error(f"Fout bij het laden van checklists: {str(e)}")
            return pd.DataFrame()
    return pd.DataFrame()

def save_todo(todo_data):
    """Sla een nieuwe to-do op in het to-do bestand"""
    if not os.path.exists("todos.csv"):
        df = pd.DataFrame([todo_data])
        df.to_csv("todos.csv", index=False)
    else:
        df = pd.DataFrame([todo_data])
        df.to_csv("todos.csv", mode="a", header=False, index=False)
    return True

def load_todos():
    """Laad alle to-dos uit het bestand"""
    if os.path.exists("todos.csv"):
        return pd.read_csv("todos.csv")
    return pd.DataFrame()

def update_todo_status(todo_id, new_status):
    """Update de status van een to-do"""
    if os.path.exists("todos.csv"):
        todos = pd.read_csv("todos.csv")
        if todo_id in todos.index:
            todos.at[todo_id, 'status'] = new_status
            todos.to_csv("todos.csv", index=False)
            return True
    return False

def save_photo(file, klant_id, product_type):
    """Sla een foto op in de uploads map"""
    # Maak een map voor de klant als deze nog niet bestaat
    klant_dir = os.path.join("uploads", klant_id.replace(" ", "_"))
    if not os.path.exists(klant_dir):
        os.makedirs(klant_dir)
    
    # Genereer een unieke bestandsnaam
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    filename = f"foto_{product_type}_{timestamp}.jpg"
    filepath = os.path.join(klant_dir, filename)
    
    # Sla de foto op
    with open(filepath, "wb") as f:
        f.write(file.getbuffer())
    
    return filepath

def create_pdf(checklist, todos=None):
    """Genereer drie verschillende documenten:
    1. PDF voor de klant
    2. To-do lijst voor de chauffeur
    3. Intern bericht voor Lavans
    """
    # 1. PDF voor de klant
    pdf_klant = FPDF()
    pdf_klant.add_page()
    
    # Voeg het Lavans logo toe (groot en gecentreerd bovenaan)
    if os.path.exists("Logo-Lavans-png.png"):
        # Bereken van de breedte om het logo te centreren
        page_width = pdf_klant.w
        logo_width = 50  # Kleiner logo
        x_position = (page_width - logo_width) / 2
        pdf_klant.image("Logo-Lavans-png.png", x=x_position, y=10, w=logo_width)
        pdf_klant.ln(30)  # Minder ruimte na het logo
    
    # Titel in het midden
    pdf_klant.set_font("Arial", 'B', size=20)
    pdf_klant.cell(0, 15, txt="Service Checklist", ln=True, align='C')
    pdf_klant.ln(10)
    
    # Basisgegevens sectie met mooiere opmaak
    pdf_klant.set_font("Arial", 'B', size=14)
    pdf_klant.set_fill_color(240, 240, 240)  # Lichtgrijze achtergrond
    pdf_klant.cell(0, 10, txt="Basisgegevens", ln=True, fill=True)
    pdf_klant.ln(5)
    
    # Basisgegevens in een nette tabel
    pdf_klant.set_font("Arial", 'B', size=11)
    pdf_klant.cell(40, 8, txt="Klant:", ln=0)
    pdf_klant.set_font("Arial", size=11)
    pdf_klant.cell(150, 8, txt=checklist.get("klant", ""), ln=1)
    
    pdf_klant.set_font("Arial", 'B', size=11)
    pdf_klant.cell(40, 8, txt="Datum bezoek:", ln=0)
    pdf_klant.set_font("Arial", size=11)
    pdf_klant.cell(150, 8, txt=checklist.get("datum", ""), ln=1)
    
    pdf_klant.set_font("Arial", 'B', size=11)
    pdf_klant.cell(40, 8, txt="Chauffeur:", ln=0)
    pdf_klant.set_font("Arial", size=11)
    pdf_klant.cell(150, 8, txt=checklist.get("chauffeur", ""), ln=1)
    
    pdf_klant.set_font("Arial", 'B', size=11)
    pdf_klant.cell(40, 8, txt="Locatie:", ln=0)
    pdf_klant.set_font("Arial", size=11)
    pdf_klant.cell(150, 8, txt=checklist.get("locatie", ""), ln=1)
    
    pdf_klant.ln(10)
    
    # Voeg checklist-items toe per categorie met verbeterde opmaak
    if "matten_frequentie" in checklist:
        pdf_klant.set_font("Arial", 'B', size=14)
        pdf_klant.set_fill_color(240, 240, 240)
        pdf_klant.cell(0, 10, txt="Matten", ln=True, fill=True)
        pdf_klant.ln(5)
        
        pdf_klant.set_font("Arial", 'B', size=11)
        pdf_klant.cell(70, 8, txt="Frequentie correct:", ln=0)
        pdf_klant.set_font("Arial", size=11)
        pdf_klant.cell(120, 8, txt=checklist.get("matten_frequentie", ""), ln=1)
        
        if checklist.get("matten_frequentie_toelichting"):
            pdf_klant.set_font("Arial", 'B', size=11)
            pdf_klant.cell(70, 8, txt="Toelichting frequentie:", ln=0)
            pdf_klant.set_font("Arial", size=11)
            pdf_klant.cell(120, 8, txt=checklist.get("matten_frequentie_toelichting", ""), ln=1)
        
        pdf_klant.set_font("Arial", 'B', size=11)
        pdf_klant.cell(70, 8, txt="Concurrentie aanwezig:", ln=0)
        pdf_klant.set_font("Arial", size=11)
        pdf_klant.cell(120, 8, txt=checklist.get("matten_concurrentie", ""), ln=1)
        
        if checklist.get("matten_concurrentie_toelichting"):
            pdf_klant.set_font("Arial", 'B', size=11)
            pdf_klant.cell(70, 8, txt="Toelichting concurrentie:", ln=0)
            pdf_klant.set_font("Arial", size=11)
            pdf_klant.cell(120, 8, txt=checklist.get("matten_concurrentie_toelichting", ""), ln=1)
        
        pdf_klant.ln(5)
    
    # Voeg andere product categorieën toe op dezelfde manier...
    # (Wissers, Sanitair, Poetsdoeken - niet alle code hier weergegeven voor leesbaarheid)
    
    # Handtekening sectie met verbeterde opmaak
    pdf_klant.ln(15)
    pdf_klant.set_font("Arial", 'B', size=12)
    pdf_klant.cell(90, 10, txt="Handtekening chauffeur:", ln=0)
    pdf_klant.cell(90, 10, txt="Handtekening klant:", ln=1)
    pdf_klant.ln(15)
    
    # Lijnen voor handtekeningen
    pdf_klant.line(20, pdf_klant.get_y(), 90, pdf_klant.get_y())
    pdf_klant.line(110, pdf_klant.get_y(), 180, pdf_klant.get_y())
    
    # Voeg een footer toe met contactgegevens
    pdf_klant.ln(30)
    pdf_klant.set_font("Arial", 'I', size=8)
    pdf_klant.cell(0, 5, txt="Lavans - Uw partner in hygiëne en facility management", ln=True, align='C')
    pdf_klant.cell(0, 5, txt="Tel: 020-1234567 | Email: info@lavans.nl | www.lavans.nl", ln=True, align='C')
    
    # 2. To-do lijst voor chauffeur
    pdf_chauffeur = FPDF()
    pdf_chauffeur.add_page()
    pdf_chauffeur.set_font("Arial", 'B', size=16)
    pdf_chauffeur.cell(200, 10, txt="Actiepunten voor chauffeur", ln=True, align='C')
    pdf_chauffeur.ln(5)
    
    pdf_chauffeur.set_font("Arial", 'B', size=12)
    pdf_chauffeur.cell(0, 10, txt=f"Klant: {checklist.get('klant', '')}", ln=True)
    pdf_chauffeur.cell(0, 10, txt=f"Datum: {checklist.get('datum', '')}", ln=True)
    pdf_chauffeur.cell(0, 10, txt=f"Locatie: {checklist.get('locatie', '')}", ln=True)
    pdf_chauffeur.ln(5)
    
    # To-do sectie voor chauffeur
    if todos is not None and not todos.empty:
        pdf_chauffeur.set_font("Arial", 'B', size=14)
        pdf_chauffeur.cell(0, 10, txt="Direct uit te voeren acties:", ln=True)
        pdf_chauffeur.ln(5)
        
        pdf_chauffeur.set_font("Arial", 'B', size=11)
        pdf_chauffeur.cell(10, 10, txt="Nr.", border=1, ln=0, align='C')
        pdf_chauffeur.cell(100, 10, txt="Actiepunt", border=1, ln=0)
        pdf_chauffeur.cell(40, 10, txt="Prioriteit", border=1, ln=0, align='C')
        pdf_chauffeur.cell(40, 10, txt="Deadline", border=1, ln=1, align='C')
        
        pdf_chauffeur.set_font("Arial", size=11)
        for i, todo in todos.iterrows():
            y_position = pdf_chauffeur.get_y()
            
            # Check if we need a new page
            if y_position > 250:  # Near bottom of page
                pdf_chauffeur.add_page()
                pdf_chauffeur.set_font("Arial", 'B', size=11)
                pdf_chauffeur.cell(10, 10, txt="Nr.", border=1, ln=0, align='C')
                pdf_chauffeur.cell(100, 10, txt="Actiepunt", border=1, ln=0)
                pdf_chauffeur.cell(40, 10, txt="Prioriteit", border=1, ln=0, align='C')
                pdf_chauffeur.cell(40, 10, txt="Deadline", border=1, ln=1, align='C')
                pdf_chauffeur.set_font("Arial", size=11)
            
            # Print each to-do
            pdf_chauffeur.cell(10, 10, txt=str(i+1), border=1, ln=0, align='C')
            pdf_chauffeur.cell(100, 10, txt=todo['beschrijving'][:40], border=1, ln=0)
            pdf_chauffeur.cell(40, 10, txt=todo['prioriteit'], border=1, ln=0, align='C')
            pdf_chauffeur.cell(40, 10, txt=todo['deadline'], border=1, ln=1, align='C')
    
    # 3. Intern bericht voor Lavans
    pdf_lavans = FPDF()
    pdf_lavans.add_page()
    pdf_lavans.set_font("Arial", 'B', size=16)
    pdf_lavans.cell(200, 10, txt="Intern Rapport Lavans", ln=True, align='C')
    pdf_lavans.ln(5)
    
    pdf_lavans.set_font("Arial", 'B', size=12)
    pdf_lavans.cell(0, 10, txt=f"Klant: {checklist.get('klant', '')}", ln=True)
    pdf_lavans.cell(0, 10, txt=f"Datum bezoek: {checklist.get('datum', '')}", ln=True)
    pdf_lavans.cell(0, 10, txt=f"Chauffeur: {checklist.get('chauffeur', '')}", ln=True)
    pdf_lavans.cell(0, 10, txt=f"Locatie: {checklist.get('locatie', '')}", ln=True)
    pdf_lavans.ln(5)
    
    # Toegangsinformatie
    pdf_lavans.set_font("Arial", 'B', size=14)
    pdf_lavans.cell(0, 10, txt="Toegangsinformatie", ln=True)
    
    pdf_lavans.set_font("Arial", size=11)
    pdf_lavans.cell(0, 8, txt=f"Toegang: {checklist.get('toegang', '')}", ln=True)
    if checklist.get('toegang_toelichting'):
        pdf_lavans.cell(0, 8, txt=f"Toelichting: {checklist.get('toegang_toelichting', '')}", ln=True)
    pdf_lavans.ln(5)
    
    # Productinformatie
    pdf_lavans.set_font("Arial", 'B', size=14)
    pdf_lavans.cell(0, 10, txt="Productinformatie", ln=True)
    
    # Matten
    if "matten_frequentie" in checklist:
        pdf_lavans.set_font("Arial", 'B', size=12)
        pdf_lavans.cell(0, 8, txt="Matten:", ln=True)
        pdf_lavans.set_font("Arial", size=11)
        pdf_lavans.cell(0, 8, txt=f"Frequentie: {checklist.get('matten_frequentie', '')}", ln=True)
        if checklist.get('matten_frequentie_toelichting'):
            pdf_lavans.cell(0, 8, txt=f"Toelichting: {checklist.get('matten_frequentie_toelichting', '')}", ln=True)
        pdf_lavans.cell(0, 8, txt=f"Concurrentie: {checklist.get('matten_concurrentie', '')}", ln=True)
        if checklist.get('matten_concurrentie_toelichting'):
            pdf_lavans.cell(0, 8, txt=f"Toelichting: {checklist.get('matten_concurrentie_toelichting', '')}", ln=True)
        pdf_lavans.ln(3)
    
    # Wissers
    if "wissers_frequentie" in checklist:
        pdf_lavans.set_font("Arial", 'B', size=12)
        pdf_lavans.cell(0, 8, txt="Wissers:", ln=True)
        pdf_lavans.set_font("Arial", size=11)
        pdf_lavans.cell(0, 8, txt=f"Toegang: {checklist.get('wissers_toegang', '')}", ln=True)
        pdf_lavans.cell(0, 8, txt=f"Frequentie: {checklist.get('wissers_frequentie', '')}", ln=True)
        if checklist.get('wissers_frequentie_toelichting'):
            pdf_lavans.cell(0, 8, txt=f"Toelichting: {checklist.get('wissers_frequentie_toelichting', '')}", ln=True)
        pdf_lavans.cell(0, 8, txt=f"Aantal klopt: {checklist.get('wissers_aantal_klopt', '')}", ln=True)
        if checklist.get('wissers_werkelijk_aantal'):
            pdf_lavans.cell(0, 8, txt=f"Werkelijk aantal: {checklist.get('wissers_werkelijk_aantal', '')}", ln=True)
        pdf_lavans.ln(3)
    
    # Sanitair
    if "sanitair_handdoekrollen_aantal" in checklist:
        pdf_lavans.set_font("Arial", 'B', size=12)
        pdf_lavans.cell(0, 8, txt="Sanitair:", ln=True)
        pdf_lavans.set_font("Arial", size=11)
        pdf_lavans.cell(0, 8, txt=f"Handdoekrollen: {checklist.get('sanitair_handdoekrollen_aantal', '')}", ln=True)
        pdf_lavans.cell(0, 8, txt=f"Voldoende: {checklist.get('sanitair_handdoekrollen_voldoende', '')}", ln=True)
        pdf_lavans.cell(0, 8, txt=f"Dispensers functioneel: {checklist.get('dispensers_functioneel', '')}", ln=True)
        if checklist.get('dispensers_nieuw') != "n.v.t.":
            pdf_lavans.cell(0, 8, txt=f"Vervanging gewenst: {checklist.get('dispensers_nieuw', '')}", ln=True)
        pdf_lavans.ln(3)
    
    # Poetsdoeken
    if "poetsdoeken_status" in checklist:
        pdf_lavans.set_font("Arial", 'B', size=12)
        pdf_lavans.cell(0, 8, txt="Poetsdoeken:", ln=True)
        pdf_lavans.set_font("Arial", size=11)
        pdf_lavans.cell(0, 8, txt=f"Status: {checklist.get('poetsdoeken_status', '')}", ln=True)
        pdf_lavans.cell(0, 8, txt=f"Kleuren: {checklist.get('poetsdoeken_kleuren', '')}", ln=True)
        if checklist.get('poetsdoeken_toelichting'):
            pdf_lavans.cell(0, 8, txt=f"Toelichting: {checklist.get('poetsdoeken_toelichting', '')}", ln=True)
        pdf_lavans.ln(3)
    
    # Actiepunten voor Lavans
    if todos is not None and not todos.empty:
        pdf_lavans.add_page()
        pdf_lavans.set_font("Arial", 'B', size=14)
        pdf_lavans.cell(0, 10, txt="Actiepunten voor Lavans", ln=True)
        pdf_lavans.ln(5)
        
        pdf_lavans.set_font("Arial", 'B', size=11)
        pdf_lavans.cell(10, 10, txt="Nr.", border=1, ln=0, align='C')
        pdf_lavans.cell(100, 10, txt="Actiepunt", border=1, ln=0)
        pdf_lavans.cell(40, 10, txt="Prioriteit", border=1, ln=0, align='C')
        pdf_lavans.cell(40, 10, txt="Deadline", border=1, ln=1, align='C')
        
        pdf_lavans.set_font("Arial", size=11)
        for i, todo in todos.iterrows():
            y_position = pdf_lavans.get_y()
            
            # Check if we need a new page
            if y_position > 250:  # Near bottom of page
                pdf_lavans.add_page()
                pdf_lavans.set_font("Arial", 'B', size=11)
                pdf_lavans.cell(10, 10, txt="Nr.", border=1, ln=0, align='C')
                pdf_lavans.cell(100, 10, txt="Actiepunt", border=1, ln=0)
                pdf_lavans.cell(40, 10, txt="Prioriteit", border=1, ln=0, align='C')
                pdf_lavans.cell(40, 10, txt="Deadline", border=1, ln=1, align='C')
                pdf_lavans.set_font("Arial", size=11)
            
            # Print each to-do
            pdf_lavans.cell(10, 10, txt=str(i+1), border=1, ln=0, align='C')
            pdf_lavans.cell(100, 10, txt=todo['beschrijving'][:40], border=1, ln=0)
            pdf_lavans.cell(40, 10, txt=todo['prioriteit'], border=1, ln=0, align='C')
            pdf_lavans.cell(40, 10, txt=todo['deadline'], border=1, ln=1, align='C')
    
    # Geef de drie PDF's als bytes terug
    return {
        "klant": pdf_klant.output(dest="S").encode("latin-1"),
        "chauffeur": pdf_chauffeur.output(dest="S").encode("latin-1"),
        "lavans": pdf_lavans.output(dest="S").encode("latin-1")
    }

def send_email(subject, body, attachments, recipients):
    """
    Verstuur een email met bijlagen
    """
    try:
        # Email configuratie
        sender_email = os.getenv("LAVANS_EMAIL", "service@lavans.nl")
        password = os.getenv("LAVANS_EMAIL_PASSWORD", "")
        smtp_server = os.getenv("LAVANS_SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("LAVANS_SMTP_PORT", "587"))

        if not password:
            return False, "Email wachtwoord niet geconfigureerd"
        
        # Maak het email bericht
        msg = MIMEMultipart()
        msg['Subject'] = subject
        msg['From'] = sender_email
        msg['To'] = ", ".join(recipients)
        
        # Voeg de tekst toe
        msg.attach(MIMEText(body, 'plain'))
        
        # Voeg bijlagen toe
        for filename, file_bytes in attachments.items():
            part = MIMEApplication(file_bytes, Name=filename)
            part['Content-Disposition'] = f'attachment; filename="{filename}"'
            msg.attach(part)
        
        # Verbind met de SMTP server
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, password)
        server.send_message(msg)
        server.quit()
        
        return True, "Email succesvol verstuurd!"
    
    except Exception as e:
        return False, f"Fout bij versturen email: {str(e)}"

# --- Nieuwe checklist pagina ---
if page == "Nieuwe checklist":
    st.title("Servicechecklist Lavans")
    st.markdown("<div style='margin-bottom: 1.5rem;'>Vul de checklist in na het bezoek aan de klant</div>", unsafe_allow_html=True)
    
    # Selecteer klant uit het dummy CRM
    klant_selectie = st.selectbox("Selecteer klant", options=list(dummy_crm.keys()))
    producten_beschikbaar = dummy_crm[klant_selectie]["producten"]
    aantal_dispensers = dummy_crm[klant_selectie].get("aantal_dispensers", 0)
    
    st.write("Beschikbare producten voor deze klant:", ", ".join(producten_beschikbaar))
    st.write(f"Aantal dispensers volgens CRM: **{aantal_dispensers}**")
    
    # Bepaal controle-methode op basis van aantal dispensers
    if aantal_dispensers < 10:
        controle_methode = "Volledige controle"
        st.info("Minder dan 10 dispensers: er wordt een 100% controle uitgevoerd.")
    else:
        controle_methode = st.radio(
            "Welke controle-methode willen we toepassen?",
            ["Volledige controle", "Steekproef"],
            key="controle_methode"
        )
    if controle_methode == "Steekproef":
        aantal_steekproef = min(5, aantal_dispensers)
        geselecteerde_dispensers = random.sample(range(1, aantal_dispensers+1), aantal_steekproef)
        st.write(f"We controleren steekproefsgewijs de volgende {aantal_steekproef} dispensers:")
        st.write(geselecteerde_dispensers)
    else:
        st.write("Er wordt een volledige controle uitgevoerd (alle dispensers).")
    
    # Basisgegevens
    col1, col2 = st.columns(2)
    with col1:
        klant_naam = st.text_input("Klantnaam", value=klant_selectie)
        klant_locatie = st.text_input("Locatie", placeholder="Plaats")
    with col2:
        chauffeur_naam = st.text_input("Jouw naam", placeholder="Naam chauffeur", value=st.session_state.username)
        datum_bezoek = st.date_input("Datum bezoek", datetime.now())
    
    st.subheader("Toegang")
    toegang_vraag = st.radio("Heb je volledige toegang tot alle relevante delen van het pand?", ["Ja", "Gedeeltelijk", "Nee"])
    toegang_toelichting = ""
    if toegang_vraag in ["Gedeeltelijk", "Nee"]:
        toegang_toelichting = st.text_area("Toelichting toegang", placeholder="Geef aan tot welke delen je geen toegang had")
    
    # Initiële checklist data
    checklist_data = {
        "datum": datum_bezoek.strftime("%Y-%m-%d"),
        "chauffeur": chauffeur_naam,
        "klant": klant_naam,
        "locatie": klant_locatie,
        "toegang": toegang_vraag,
        "toegang_toelichting": toegang_toelichting,
        "controle_methode": controle_methode
    }
    
    uploaded_photos = {}
    
    # --- Sectie Matten ---
    if "Matten" in producten_beschikbaar:
        st.markdown("---")
        st.subheader("Checklist Matten")
        matten_frequentie = st.radio(
            "Klopt de huidige wissel-frequentie voor de matten?",
            ["Ja", "Nee, zou verhoogd moeten worden", "Nee, zou verlaagd kunnen worden", "Kan niet beoordelen"],
            key="matten_frequentie"
        )
        matten_frequentie_toelichting = ""
        if matten_frequentie not in ["Ja", "Kan niet beoordelen"]:
            matten_frequentie_toelichting = st.text_area(
                "Toelichting frequentie",
                placeholder="Geef hier je advies over de frequentie",
                key="matten_freq_toelichting"
            )
        # Nieuwe vraag: Zien we matten van de concurrent?
        matten_concurrentie = st.radio(
            "Zien we matten van de concurrent?",
            ["Nee", "Ja, koopmatten", "Ja, concurrentmatten", "Ja, beide", "Kan niet beoordelen"],
            key="matten_concurrentie"
        )
        matten_concurrentie_toelichting = ""
        if matten_concurrentie not in ["Nee", "Kan niet beoordelen"]:
            matten_concurrentie_toelichting = st.text_area(
                "Toelichting concurrentie",
                placeholder="Beschrijf welke matten van de concurrent je ziet",
                key="matten_concurrentie_toelichting"
            )
        st.subheader("Foto's van matten")
        matten_fotos = st.file_uploader(
            "Upload foto's van matten (optioneel)",
            accept_multiple_files=True,
            key="matten_fotos"
        )
        if matten_fotos:
            for file in matten_fotos:
                foto_path = save_photo(file, klant_naam, "matten")
                uploaded_photos.setdefault("matten", []).append(foto_path)
    
        checklist_data.update({
            "matten_frequentie": matten_frequentie,
            "matten_frequentie_toelichting": matten_frequentie_toelichting,
            "matten_concurrentie": matten_concurrentie,
            "matten_concurrentie_toelichting": matten_concurrentie_toelichting,
            "matten_fotos": json.dumps(uploaded_photos.get("matten", []))
        })
    
    # --- Sectie Wissers ---
    if "Wissers" in producten_beschikbaar:
        st.markdown("---")
        st.subheader("Checklist Wissers")
        wissers_toegang = st.radio(
            "Kon je alle ruimtes controleren waar wissers worden gebruikt?",
            ["Ja, volledige controle", "Nee, alleen bij wisselplek", "Kan niet beoordelen"],
            key="wissers_toegang"
        )
        wissers_frequentie = st.radio(
            "Klopt de huidige wissel-frequentie voor de wissers?",
            ["Ja", "Nee, zou verhoogd moeten worden", "Nee, zou verlaagd kunnen worden", "Kan niet beoordelen"],
            key="wissers_frequentie"
        )
        wissers_frequentie_toelichting = ""
        if wissers_frequentie not in ["Ja", "Kan niet beoordelen"]:
            wissers_frequentie_toelichting = st.text_area(
                "Toelichting frequentie wissers",
                placeholder="Geef je advies over de frequentie",
                key="wissers_freq_toelichting"
            )
    
        col_w1, col_w2 = st.columns(2)
        with col_w1:
            wissers_aantal_klopt = st.radio(
                "Klopt het aantal wissers volgens het abonnement?",
                ["Ja", "Nee, er zijn er meer", "Nee, er zijn er minder", "Kan niet beoordelen"],
                key="wissers_aantal"
            )
        with col_w2:
            if wissers_aantal_klopt in ["Nee, er zijn er meer", "Nee, er zijn er minder"]:
                wissers_werkelijk_aantal = st.number_input(
                    "Hoeveel wissers zijn er werkelijk?",
                    min_value=0,
                    value=0,
                    key="wissers_aantal_input"
                )
            else:
                wissers_werkelijk_aantal = 0
        st.subheader("Foto's van wissers")
        wissers_fotos = st.file_uploader(
            "Upload foto's van wissers (optioneel)",
            accept_multiple_files=True,
            key="wissers_fotos"
        )
        if wissers_fotos:
            for file in wissers_fotos:
                foto_path = save_photo(file, klant_naam, "wissers")
                uploaded_photos.setdefault("wissers", []).append(foto_path)
    
        checklist_data.update({
            "wissers_toegang": wissers_toegang,
            "wissers_frequentie": wissers_frequentie,
            "wissers_frequentie_toelichting": wissers_frequentie_toelichting,
            "wissers_aantal_klopt": wissers_aantal_klopt,
            "wissers_werkelijk_aantal": wissers_werkelijk_aantal,
            "wissers_fotos": json.dumps(uploaded_photos.get("wissers", []))
        })
    
    # --- Sectie Sanitair ---
    if "Sanitair" in producten_beschikbaar:
        st.markdown("---")
        st.subheader("Checklist Sanitair")
        col_h1, col_h2 = st.columns(2)
        with col_h1:
            sanitair_handdoekrollen_aantal = st.number_input(
                "Hoeveel handdoekrollen liggen er op de wisselplek?",
                min_value=0,
                value=0,
                key="sanitair_handdoekrollen"
            )
        with col_h2:
            sanitair_handdoekrollen_voldoende = st.radio(
                "Is dit voldoende voor de klant?",
                ["Ja", "Nee", "Kan niet beoordelen"],
                key="sanitair_voldoende"
            )
        st.markdown("### Hardware dispensers")
        dispensers_functioneel = st.radio(
            "Werken de dispensers naar behoren?",
            ["Ja", "Nee", "Kan niet beoordelen"],
            key="dispensers_functioneel"
        )
        if dispensers_functioneel == "Nee":
            dispensers_nieuw = st.radio(
                "Is vervanging gewenst?",
                ["Nee", "Ja", "Misschien"],
                key="dispensers_nieuw"
            )
        else:
            dispensers_nieuw = "n.v.t."
        st.subheader("Foto's van sanitair")
        sanitair_fotos = st.file_uploader(
            "Upload foto's van sanitair (optioneel)",
            accept_multiple_files=True,
            key="sanitair_fotos"
        )
        if sanitair_fotos:
            for file in sanitair_fotos:
                foto_path = save_photo(file, klant_naam, "sanitair")
                uploaded_photos.setdefault("sanitair", []).append(foto_path)
    
        checklist_data.update({
            "sanitair_handdoekrollen_aantal": sanitair_handdoekrollen_aantal,
            "sanitair_handdoekrollen_voldoende": sanitair_handdoekrollen_voldoende,
            "dispensers_functioneel": dispensers_functioneel,
            "dispensers_nieuw": dispensers_nieuw,
            "sanitair_fotos": json.dumps(uploaded_photos.get("sanitair", []))
        })
    
    # --- Sectie Poetsdoeken ---
    if "Poetsdoeken" in producten_beschikbaar:
        st.markdown("---")
        st.subheader("Checklist Poetsdoeken")
        poetsdoeken_status = st.radio(
            "Zijn er voldoende poetsdoeken aanwezig?",
            ["Voldoende", "Onvoldoende", "Niet aanwezig"],
            key="poetsdoeken_status"
        )
        poetsdoeken_kleuren = st.text_input(
            "Welke kleuren zie je bij de klant?",
            placeholder="Bijv. blauw, grijs, wit",
            key="poetsdoeken_kleuren"
        )
        poetsdoeken_toelichting = st.text_area(
            "Eventuele aandachtspunten?",
            placeholder="Geef extra toelichting indien nodig",
            key="poetsdoeken_toelichting"
        )
        st.subheader("Foto's van poetsdoeken")
        poetsdoeken_fotos = st.file_uploader(
            "Upload foto's van poetsdoeken (optioneel)",
            accept_multiple_files=True,
            key="poetsdoeken_fotos"
        )
        if poetsdoeken_fotos:
            for file in poetsdoeken_fotos:
                foto_path = save_photo(file, klant_naam, "poetsdoeken")
                uploaded_photos.setdefault("poetsdoeken", []).append(foto_path)
    
        checklist_data.update({
            "poetsdoeken_status": poetsdoeken_status,
            "poetsdoeken_kleuren": poetsdoeken_kleuren,
            "poetsdoeken_toelichting": poetsdoeken_toelichting,
            "poetsdoeken_fotos": json.dumps(uploaded_photos.get("poetsdoeken", []))
        })

    # --- NIEUWE SECTIE: Actielijst / To-Do ---
    st.markdown("---")
    st.subheader("Actiepunten (To-Do Lijst)")
    st.markdown("Voeg hier actiepunten toe die naar aanleiding van dit bezoek moeten worden uitgevoerd:")
    
    # Container voor to-do items
    if "todo_items" not in st.session_state:
        st.session_state.todo_items = []
    
    # Nieuw to-do item toevoegen
    col_todo1, col_todo2 = st.columns([3, 1])
    with col_todo1:
        new_todo = st.text_input("Nieuw actiepunt", key="new_todo", placeholder="Beschrijf het actiepunt")
    with col_todo2:
        todo_priority = st.selectbox("Prioriteit", ["Laag", "Middel", "Hoog"], key="todo_priority")
    
    col_todo3, col_todo4, col_todo5 = st.columns([2, 2, 1])
    with col_todo3:
        todo_deadline = st.date_input("Deadline", datetime.now() + pd.Timedelta(days=7), key="todo_deadline")
    with col_todo4:
        todo_assignee = st.text_input("Verantwoordelijke", value=chauffeur_naam, key="todo_assignee")
    with col_todo5:
        if st.button("Toevoegen", key="add_todo"):
            if new_todo:  # Alleen toevoegen als er tekst is
                todo_item = {
                    "beschrijving": new_todo,
                    "prioriteit": todo_priority,
                    "deadline": todo_deadline.strftime("%Y-%m-%d"),
                    "verantwoordelijke": todo_assignee,
                    "status": "Open",
                    "klant": klant_naam,
                    "datum_aangemaakt": datetime.now().strftime("%Y-%m-%d")
                }
                st.session_state.todo_items.append(todo_item)
                # Reset the input field
                st.session_state.new_todo = ""
                st.rerun()
            else:
                st.info("Voer een beschrijving in voor het actiepunt.")
    
    # Toon de toegevoegde to-do items
    if st.session_state.todo_items:
        st.markdown("### Toegevoegde actiepunten")
        for i, todo in enumerate(st.session_state.todo_items):
            col1, col2, col3, col4 = st.columns([3, 1, 1, 1])
            with col1:
                st.write(f"**{i+1}. {todo['beschrijving']}**")
            with col2:
                st.write(f"Prioriteit: {todo['prioriteit']}")
            with col3:
                st.write(f"Deadline: {todo['deadline']}")
            with col4:
                if st.button("Verwijderen", key=f"del_todo_{i}"):
                    st.session_state.todo_items.pop(i)
                    st.rerun()
    else:
        st.info("Nog geen actiepunten toegevoegd.")
    
    # Opslaan en PDF genereren
    if st.button("Opslaan checklist"):
        if klant_naam and chauffeur_naam:
            save_checklist(checklist_data)
            st.success("Checklist succesvol opgeslagen!")
            
            # Opslaan van to-do items in de database
            if st.session_state.todo_items:
                for todo in st.session_state.todo_items:
                    save_todo(todo)
                st.success(f"{len(st.session_state.todo_items)} actiepunten succesvol opgeslagen!")
                
                # Laad alle to-dos voor deze klant om in de PDF op te nemen
                all_todos = pd.DataFrame(st.session_state.todo_items)
            else:
                all_todos = pd.DataFrame()
            
            # Genereer de PDF's met checklist en to-do's
            pdf_bytes = create_pdf(checklist_data, all_todos)
            
            # Initialiseer de session state voor de PDF goedkeuring als deze nog niet bestaat
            if "pdf_approved" not in st.session_state:
                st.session_state.pdf_approved = False
            if "email_sent" not in st.session_state:
                st.session_state.email_sent = False
            if "show_email_section" not in st.session_state:
                st.session_state.show_email_section = False
            
            st.subheader("Controleer de documenten")
            
            # PDF voor klant
            st.write("### PDF voor klant")
            
            # Download knop voor PDF
            st.download_button(
                label="Download PDF voor klant",
                data=pdf_bytes["klant"],
                file_name=f"{klant_naam}_checklist_{datum_bezoek.strftime('%Y%m%d')}_klant.pdf",
                mime="application/pdf"
            )
            
            # PDF preview
            st.markdown("#### PDF Preview")
            st.info("""
            **Basisgegevens:**
            - Klant: {}
            - Datum bezoek: {}
            - Chauffeur: {}
            - Locatie: {}
            
            **Toegang:**
            - Status: {}
            {}
            
            **Producten:**
            {}
            """.format(
                klant_naam,
                datum_bezoek.strftime("%d-%m-%Y"),
                chauffeur_naam,
                klant_locatie,
                toegang_vraag,
                f"- Toelichting: {toegang_toelichting}" if toegang_toelichting else "",
                "\n".join([f"- {product}" for product in producten_beschikbaar])
            ))
            
            # Email sectie
            st.markdown("---")
            st.subheader("✉️ Verstuur checklist naar klant")
            
            # Email invoer
            klant_email = st.text_input(
                "Email adres klant",
                placeholder="voorbeeld@bedrijf.nl"
            )
            
            if klant_email:
                # Email preview
                email_subject = f"Service Checklist {klant_naam} - {datum_bezoek.strftime('%d-%m-%Y')}"
                email_body = f"""
Beste,

Hierbij ontvangt u de service checklist voor {klant_naam} van {datum_bezoek.strftime('%d-%m-%Y')}.

Met vriendelijke groet,
{chauffeur_naam}
Lavans Service
                """
                
                st.info(f"""
                **Email preview:**
                
                **Aan:** {klant_email}
                **Onderwerp:** {email_subject}
                
                {email_body}
                
                **Bijlage:** {klant_naam}_checklist_{datum_bezoek.strftime('%Y%m%d')}_klant.pdf
                """)
                
                # Verstuur knop
                if st.button("✉️ Verstuur email", type="primary"):
                    attachments = {
                        f"{klant_naam}_checklist_{datum_bezoek.strftime('%Y%m%d')}_klant.pdf": 
                        pdf_bytes["klant"]
                    }
                    
                    with st.spinner("Email wordt verstuurd..."):
                        success, message = send_email(
                            email_subject,
                            email_body,
                            attachments,
                            [klant_email]
                        )
                    
                    if success:
                        st.success(f"✅ Checklist succesvol verstuurd naar {klant_email}")
                    else:
                        st.error(f"❌ {message}")
            else:
                st.info("Vul een email adres in om de preview te zien.")
            
            # PDF voor chauffeur
            st.write("### Actielijst voor chauffeur")
            st.download_button(
                label="Download actielijst voor chauffeur",
                data=pdf_bytes["chauffeur"],
                file_name=f"{klant_naam}_actielijst_{datum_bezoek.strftime('%Y%m%d')}_chauffeur.pdf",
                mime="application/pdf"
            )
            
            # PDF voor Lavans
            st.write("### Intern rapport voor Lavans")
            st.download_button(
                label="Download intern rapport voor Lavans",
                data=pdf_bytes["lavans"],
                file_name=f"{klant_naam}_rapport_{datum_bezoek.strftime('%Y%m%d')}_lavans.pdf",
                mime="application/pdf"
            )
        else:
            st.info("Vul alstublieft zowel de klantnaam als jouw naam in.")

# --- Overzichtspagina ---
elif page == "Overzicht checklists":
    st.title("Overzicht Servicechecklists")
    checklists = load_checklists()
    if not checklists.empty:
        st.subheader("Filters")
        col_f1, col_f2 = st.columns(2)
        with col_f1:
            filter_datum = st.date_input("Toon checklists vanaf", datetime.now().replace(day=1))
        with col_f2:
            if "chauffeur" in checklists.columns:
                chauffeurs = ["Alle chauffeurs"] + sorted(checklists["chauffeur"].dropna().unique().tolist())
                filter_chauffeur = st.selectbox("Chauffeur", chauffeurs)
            else:
                filter_chauffeur = "Alle chauffeurs"
        
        filtered_data = checklists.copy()
        filtered_data["datum"] = pd.to_datetime(filtered_data["datum"], errors="coerce")
        filtered_data = filtered_data[filtered_data["datum"] >= pd.to_datetime(filter_datum)]
        if filter_chauffeur != "Alle chauffeurs":
            filtered_data = filtered_data[filtered_data["chauffeur"] == filter_chauffeur]
        
        st.subheader(f"Resultaten ({len(filtered_data)} checklists)")
        if not filtered_data.empty:
            for index, row in filtered_data.iterrows():
                with st.expander(f"{row['datum']} - {row['klant']} ({row['chauffeur']})"):
                    st.write("**Basisgegevens**")
                    st.write(f"**Datum:** {row['datum']}")
                    st.write(f"**Chauffeur:** {row['chauffeur']}")
                    st.write(f"**Klant:** {row['klant']}")
                    st.write(f"**Locatie:** {row['locatie']}")
                    st.write("**Controle-methode:**")
                    st.write(f"{row.get('controle_methode', 'Onbekend')}")
                    st.write("**Toegang:**")
                    st.write(f"{row['toegang']}")
                    if row.get('toegang_toelichting'):
                        st.write(f"Toelichting: {row['toegang_toelichting']}")
                    
                    # Toon gerelateerde to-dos voor deze klant
                    todos = load_todos()
                    if not todos.empty and 'klant' in todos.columns:
                        klant_todos = todos[todos['klant'] == row['klant']]
                        if not klant_todos.empty:
                            st.markdown("### Gerelateerde actiepunten")
                            for i, todo in klant_todos.iterrows():
                                status_color = "green" if todo.get('status') == "Voltooid" else "orange"
                                st.markdown(f"- <span style='color:{status_color}'>{todo['beschrijving']}</span> - Deadline: {todo['deadline']} - Priority: {todo['prioriteit']}", unsafe_allow_html=True)
                        
                    # Je kunt hier per productgroep extra data tonen indien gewenst.
                    
                    # Zet de datum veilig om naar string, bijvoorbeeld: 20250410
                    datum = row.get("datum")
                    if hasattr(datum, "strftime"):
                        datum_str = datum.strftime("%Y%m%d")
                    else:
                        datum_str = str(datum).replace("-", "")  # fallback als het al een string is

                    # Genereer bestandsnaam met klantnaam en datum
                    file_name = f"{row.get('klant', 'onbekend')}_checklist_{datum_str}_klant.pdf"

                    # Download knop voor de PDF
                    st.download_button(
                        label="Download als PDF",
                        data=pdf_bytes["klant"],
                        file_name=file_name,
                        mime="application/pdf"
                    )