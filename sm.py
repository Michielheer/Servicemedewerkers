import streamlit as st
import pandas as pd
import os
import json
import random
from datetime import datetime
from fpdf import FPDF  # Installeer met: pip install fpdf

# --- Login-scherm ---
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False

if not st.session_state.authenticated:
    st.title("Login")
    username = st.text_input("Gebruikersnaam", placeholder="Voer gebruikersnaam in")
    password = st.text_input("Wachtwoord", type="password", placeholder="Voer wachtwoord in")
    if st.button("Login"):
        if username == "Tijn" and password == "Tijn":
            st.session_state.authenticated = True
            st.success("Succesvol ingelogd!")
            # Indien beschikbaar, kun je st.experimental_rerun() gebruiken
            st.experimental_rerun()
        else:
            st.error("Onjuiste login gegevens. Probeer opnieuw!")
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
page = st.sidebar.radio("Ga naar:", ["Nieuwe checklist", "Overzicht checklists"], key="nav_radio")

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
    if os.path.exists("checklists.csv"):
        return pd.read_csv("checklists.csv")
    return pd.DataFrame()

def save_photo(file, klant_id, product_type):
    # In een echte app kun je de file opslaan in de cloud of een database.
    return f"foto_{klant_id}_{product_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

def create_pdf(checklist):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=16)
    pdf.cell(200, 10, txt="Service Checklist", ln=True, align='C')
    pdf.ln(10)
    
    pdf.set_font("Arial", size=12)
    # Voeg elke checklist-item toe
    for key, value in checklist.items():
        # Indien het een JSON-string is (bijvoorbeeld voor foto's) probeer dit overzichtelijk te maken
        if isinstance(value, str) and value.startswith('['):
            try:
                value_list = json.loads(value)
                value = ", ".join(value_list)
            except Exception:
                pass
        line = f"{key.capitalize()}: {value}"
        pdf.multi_cell(0, 10, line)
    
    # Geef de PDF als bytes terug
    return pdf.output(dest="S").encode("latin-1")

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
        chauffeur_naam = st.text_input("Jouw naam", placeholder="Naam chauffeur")
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
                foto_id = save_photo(file, klant_naam, "matten")
                uploaded_photos.setdefault("matten", []).append(foto_id)
    
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
                foto_id = save_photo(file, klant_naam, "wissers")
                uploaded_photos.setdefault("wissers", []).append(foto_id)
    
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
                foto_id = save_photo(file, klant_naam, "sanitair")
                uploaded_photos.setdefault("sanitair", []).append(foto_id)
    
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
                foto_id = save_photo(file, klant_naam, "poetsdoeken")
                uploaded_photos.setdefault("poetsdoeken", []).append(foto_id)
    
        checklist_data.update({
            "poetsdoeken_status": poetsdoeken_status,
            "poetsdoeken_kleuren": poetsdoeken_kleuren,
            "poetsdoeken_toelichting": poetsdoeken_toelichting,
            "poetsdoeken_fotos": json.dumps(uploaded_photos.get("poetsdoeken", []))
        })
    
    # Opslaan en PDF genereren
    if st.button("Opslaan checklist"):
        if klant_naam and chauffeur_naam:
            save_checklist(checklist_data)
            st.success("Checklist succesvol opgeslagen!")
            pdf_bytes = create_pdf(checklist_data)
            st.download_button(
                label="Download de checklist als PDF",
                data=pdf_bytes,
                file_name=f"{klant_naam}_checklist_{datum_bezoek.strftime('%Y%m%d')}.pdf",
                mime="application/pdf"
            )
        else:
            st.error("Vul alstublieft zowel de klantnaam als jouw naam in.")

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
                    if row['toegang_toelichting']:
                        st.write(f"Toelichting: {row['toelichting']}")
                    # Je kunt hier per productgroep extra data tonen indien gewenst.
        else:
            st.info("Geen checklists gevonden met de geselecteerde filters.")
    else:
        st.info("Er zijn nog geen checklists ingevuld.")
        st.markdown("""
        <div style="text-align: center; margin-top: 2rem;">
            <a href="#" onclick="document.querySelector('[data-value=\'Nieuwe checklist\']').click(); return false;">
                Klik hier om een nieuwe checklist in te vullen
            </a>
        </div>
        """, unsafe_allow_html=True)

# --- Footer ---
st.markdown("""
<div style="margin-top: 2rem; text-align: center; font-size: 0.8rem; color: #666;">
    © Lavans 2025 - Servicechecklist Applicatie v1.0
</div>
""", unsafe_allow_html=True)
