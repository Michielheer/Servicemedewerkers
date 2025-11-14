# Email Inhoud - Wat Krijgt De Klant Te Zien?

## 📧 Overzicht Email Inhoud

---

## ✅ WAT ZIT ER WEL IN DE EMAIL

### **Header**
- Lavans logo (rechts)
- "Service Inspectie Rapport" (titel)

### **Aanhef**
- Beste [Contactpersoon naam]
- Introductie tekst

### **Metadata**
- **Datum**: Volledige datum (bijv. "woensdag 13 november 2024")
- **Inspecteur**: Naam van de inspecteur (bijv. "Angelo")

### **Geïnspecteerde Materialen (Aantallen)**
- Aantal Standaard Matten
- Aantal Logomatten
- Aantal Wissers
- Aantal Toebehoren

### **Aandachtspunten** (Alleen bij problemen)
- Matten die niet aanwezig zijn
- Beschadigde of vuile matten
- Sterk vervuilde matten
- Logomatten ouder dan 3-4 jaar
- Wissers die vervangen moeten worden
- **GEEN** details zoals barcodes, exacte ligplaats, vuilgraad percentages

### **Alles in Orde Bericht** (Als geen problemen)
- "Alles in orde!"
- "Alle materialen zijn in goede staat"

### **Algemene Opmerkingen** (Optioneel)
- Opmerkingen voor klant
- Service notities
- Andere algemene opmerkingen die tijdens inspectie zijn ingevoerd

### **Afsluiting**
- "Heeft u vragen..."
- "Met vriendelijke groet"
- **Inspecteur naam** (prominent)
- "Lavans Service Team"

### **Footer**
- Lavans B.V. contactgegevens
- www.lavans.nl | info@lavans.nl
- Disclaimer: "Geautomatiseerd rapport"

---

## ❌ WAT ZIT ER NIET IN DE EMAIL

### **Technische Details**
- **Geen** Inspectie ID nummer
- **Geen** InspectieTijd (alleen datum)
- **Geen** Productnummers
- **Geen** Barcodes van matten
- **Geen** Exacte leeftijd van matten (jaren/maanden)
- **Geen** Vuilgraad percentages (alleen "sterk vervuild" bij problemen)
- **Geen** Representativiteitsscore

### **Interne Informatie**
- **Geen** Ligplaats details (bijv. "Entree rij 3 positie 5")
- **Geen** Afdeling details (tenzij relevant voor probleem)
- **Geen** Contract/Abonnement nummers
- **Geen** TMS referenties
- **Geen** Interne notities of metadata
- **Geen** Service TODO's (voor intern gebruik)
- **Geen** Klantenservice TODO's (voor intern gebruik)

### **Wisser Details**
- **Geen** Aantal geteld vs gebruikt
- **Geen** Vuil percentage
- **Geen** Verbruiksanalyse
- Alleen bij vervangingen: "Vervang Xx wissers"

### **Concurrentie Informatie**
- **Geen** Matten van concurrenten
- **Geen** Aantal concurrent/koop matten
- **Geen** Namen van concurrenten
- **Geen** "Andere zaken" veld

### **Database/Systeem Info**
- **Geen** Relatienummer
- **Geen** SQL queries of logs
- **Geen** API response data
- **Geen** Timestamps (createdAt, etc.)

---

## 🎯 Design Principe

**"De klant ziet alleen wat relevant is voor hen"**

- Focus op **resultaten** niet op **proces**
- Focus op **problemen** niet op **perfecte status**
- Focus op **acties** niet op **data**
- **Professioneel** en **overzichtelijk**
- **Geen technische jargon**

---

## 📋 Voorbeeld Email Inhoud

```
┌─────────────────────────────────────────┐
│ Service Inspectie Rapport     [LOGO]   │
├─────────────────────────────────────────┤
│                                         │
│ Beste Julian Vervoort,                 │
│                                         │
│ We hebben een service-inspectie        │
│ uitgevoerd bij Multihuur BV.           │
│ Hieronder vindt u een overzicht van    │
│ onze bevindingen.                       │
│                                         │
│ ┌───────────────────────────────────┐  │
│ │ Datum: woensdag 13 november 2024 │  │
│ │ Inspecteur: Angelo               │  │
│ └───────────────────────────────────┘  │
│                                         │
│ Geïnspecteerde Materialen:             │
│                                         │
│  [12]          [5]         [8]    [3]  │
│  Standaard     Logo-      Wissers      │
│  Matten        matten               Toebehoren │
│                                         │
│ Aandachtspunten:                       │
│                                         │
│ • Mat 'Effekt 90x150' in Kantine:     │
│   niet aanwezig                        │
│ • Mat 'Effekt 60x85' in Entree:       │
│   sterk vervuild                       │
│                                         │
│ Onze klantenservice neemt contact      │
│ met u op voor eventuele vervolgacties. │
│                                         │
│ Algemene Opmerkingen:                  │
│                                         │
│ De toegangsdeur was moeilijk te        │
│ openen. Graag controleren.             │
│                                         │
│ Heeft u vragen over dit rapport?       │
│ Neem dan contact met ons op.           │
│                                         │
│ Met vriendelijke groet,                │
│ Angelo                                  │
│ Lavans Service Team                    │
│                                         │
│ Lavans B.V. | www.lavans.nl           │
│ info@lavans.nl                         │
└─────────────────────────────────────────┘
```

---

## 🔄 Samenvatting

**Klant ziet:**
- ✅ Datum inspectie
- ✅ Naam inspecteur
- ✅ Hoeveel materialen geïnspecteerd
- ✅ Wat er mis is (simpel en duidelijk)
- ✅ Algemene opmerkingen
- ✅ Contactgegevens

**Klant ziet NIET:**
- ❌ Technische details
- ❌ Interne codes/nummers
- ❌ Tijd van inspectie
- ❌ Database IDs
- ❌ Exacte ligplaats
- ❌ Barcodes
- ❌ Concurrentie info

---

**Resultaat:** Professionele, overzichtelijke email die de klant direct begrijpt!

