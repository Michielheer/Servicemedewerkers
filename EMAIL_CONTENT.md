# Email Inhoud - Uitgebreide Service Rapport

## 📧 Overzicht Email Inhoud

Dit document beschrijft de **nieuwe uitgebreide service rapport email** die klanten ontvangen na een servicebezoek.

---

## ✅ WAT ZIT ER WEL IN DE EMAIL

### **Header**
- Lavans logo (rechts)
- "Service Rapport" (titel)

### **Aanhef & Introductie**
- Beste [Contactpersoon naam]
- **Uitleg servicemoment**:
  - We checken of alles goed staat
  - Of ons systeem overeenkomt met de werkelijkheid
  - Of we verbeteringen zien

### **Wat hebben we gedaan?**
- **Datum**: Volledige datum (bijv. "donderdag 14 november 2025")
- **Inspecteur**: Naam van de inspecteur (bijv. "Tijn")
- **Gesproken met**: Naam contactpersoon

### **Samenvattende Activiteitentabel**
Overzicht met scores per categorie:
- Matten (✅ Juist / ⚠️ Verbetering mogelijk)
- Wissers
- Sanitair
- Poetsdoeken
- Bedrijfskleding
- Contactpersonen

### **Uitleg "Juist" Criteria**
Duidelijke uitleg wat we controleren:
- ✅ Ligplaats juist
- ✅ Bezoekritme juist
- ✅ Producten in goede staat
- ✅ We kunnen jullie bereiken

### **Aandachtspunten (Gegroepeerd per Categorie)**

**🧹 Matten:**
- Specifieke locatie vermeldingen [afdeling & ligplaats]
- Vervuiling status en advies
- Systeemfouten die worden aangepast
- Versleten logo matten
- Advies over wisselfrequentie

**🧻 Wissers:**
- Voorraad status
- Kapotte of ontbrekende toebehoren
- Abonnement uitbreiding advies

### **👥 Contactgegevens Wijzigingen**
Overzicht van contactpersoon mutaties:
- ✏️ **Bijgewerkt**: Aantal contactgegevens geüpdatet
- 📍 **Routecontact**: Nieuwe route contactpersonen
- ➕ **Nieuw**: Nieuwe contactpersonen toegevoegd
- ➖ **Afgemeld**: Personen die niet meer in dienst zijn

### **💡 Pro Tip: Klantenportaal**
- Uitleg over het klantenportaal
- **Tabel met portal toegang per contactpersoon**:
  - Naam
  - Status (✅ Toegang / ❌ Geen toegang)
  - Laatste inlogpoging
- Call-to-action voor toegang aanvragen

### **Algemene Opmerkingen** (Optioneel)
- Extra opmerkingen voor klant
- Service notities
- Bijzonderheden tijdens inspectie

### **📊 Help ons verbeteren - Feedback**
- Interactieve emoji feedback (😍 🙂 😐 🙁)
- Klikbare links naar feedback email
- Inspectie ID wordt automatisch meegestuurd

### **Afsluiting**
- Persoonlijke groet
- **Inspecteur naam** (groot en prominent)
- "Lavans Service Team"

### **Footer**
- Lavans B.V. contactgegevens
- 🌐 www.lavans.nl | ✉️ info@lavans.nl
- Disclaimer: "Geautomatiseerd rapport op basis van service-inspectie"

---

## ❌ WAT ZIT ER NIET IN DE EMAIL

### **Technische Details**
- **Geen** InspectieTijd (alleen datum)
- **Geen** Productnummers
- **Geen** Barcodes van matten
- **Geen** Exacte leeftijd van matten (jaren/maanden)
- **Geen** Vuilgraad percentages (alleen tekstuele beschrijving bij problemen)
- **Geen** Representativiteitsscore

### **Interne Informatie**
- **Geen** Exacte ligplaats details (bijv. "rij 3 positie 5") - alleen afdeling
- **Geen** Contract/Abonnement nummers
- **Geen** TMS referenties
- **Geen** Interne notities of metadata
- **Geen** Service TODO's (voor intern gebruik)
- **Geen** Klantenservice TODO's (voor intern gebruik)

### **Wisser Details**
- **Geen** Aantal geteld vs gebruikt
- **Geen** Vuil percentage
- **Geen** Verbruiksanalyse
- Alleen tekstuele beschrijving van problemen en acties

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
- **Geen** Email adressen van andere contactpersonen (privacy)

---

## 🎯 Design Principes

**"De klant krijgt een compleet en persoonlijk overzicht"**

- ✅ **Transparant**: Duidelijk overzicht van wat juist is en wat beter kan
- ✅ **Actionable**: Concrete verbeterpunten met uitleg
- ✅ **Persoonlijk**: Inspecteur naam prominent, directe toon
- ✅ **Interactief**: Feedback mogelijkheid via emoji's
- ✅ **Informatief**: Pro-tips over klantenportaal en contactbeheer
- ✅ **Professioneel**: Overzichtelijke opmaak met duidelijke secties
- ✅ **Klantgericht**: Focus op wat de klant kan doen of weten moet

---

## 📋 Voorbeeld Email Structuur

```
┌─────────────────────────────────────────────┐
│ Service Rapport               [LAVANS LOGO] │
├─────────────────────────────────────────────┤
│                                             │
│ Beste Michiel,                              │
│                                             │
│ [INTRODUCTIE BOX - Blauw]                   │
│ We hebben een service moment gedaan waar    │
│ we checken of alles overeenkomt met de      │
│ werkelijkheid en of we verbeteringen zien.  │
│                                             │
│ 📋 Wat hebben we gedaan?                    │
│ Datum: donderdag 14 november 2025           │
│ Inspecteur: Tijn                            │
│ Gesproken met: Michiel                      │
│                                             │
│ Samenvattend:                               │
│ ┌───────────────┬──────┬──────────────┐    │
│ │ Activiteit    │ ✅   │ ⚠️           │    │
│ ├───────────────┼──────┼──────────────┤    │
│ │ Matten        │  5   │      2       │    │
│ │ Wissers       │  0   │      0       │    │
│ │ Sanitair      │ n.v.t│   n.v.t      │    │
│ │ Poetsdoeken   │ n.v.t│   n.v.t      │    │
│ │ Bedrijfskleding│n.v.t│   n.v.t      │    │
│ │ Contactpers.  │  4   │      1       │    │
│ └───────────────┴──────┴──────────────┘    │
│                                             │
│ ✅ Wat is juist?                            │
│ • Ligplaats juist                           │
│ • Bezoekritme juist                         │
│ • Producten in goede staat                  │
│ • We kunnen jullie bereiken                 │
│                                             │
│ ⚠️ Wat is ons opgevallen?                  │
│                                             │
│ [GELE BOX - Matten]                         │
│ 🧹 Matten                                   │
│ • De mat [afdeling & ligplaats] was erg     │
│   sterk vervuild. Overweeg de               │
│   wisselfrequentie aan te passen.           │
│ • De [afdeling] staat niet goed in ons      │
│   systeem. Dit passen we aan.               │
│                                             │
│ [GELE BOX - Wissers]                        │
│ 🧻 Wissers                                  │
│ • De wissers waren bijna op. Overweeg een   │
│   uitbreiding van het abonnement.           │
│                                             │
│ 👥 Contactgegevens                          │
│ [BLAUWE BOX]                                │
│ ✏️ Bijgewerkt: 3 contactgegevens bijgewerkt│
│ ➕ Nieuw: 1 nieuwe contactpersoon           │
│                                             │
│ [LICHTBLAUWE BOX]                           │
│ 💡 Pro tip: Klantenportaal                 │
│ Niet iedereen heeft toegang tot het portaal:│
│ ┌─────────┬────────────┬──────────────┐    │
│ │ Naam    │ Status     │ Laatste inlog│    │
│ ├─────────┼────────────┼──────────────┤    │
│ │ Tijn    │ ✅ Toegang │ 16-11-2025   │    │
│ │ Michiel │ ✅ Toegang │ 15-11-2025   │    │
│ │ Max     │ ❌ Geen    │ Nooit        │    │
│ └─────────┴────────────┴──────────────┘    │
│ Wil je toegang? Neem contact op!            │
│                                             │
│ [GRIJZE BOX - Feedback]                     │
│ Help ons verbeteren!                        │
│ Wat vond je van deze mail?                  │
│    😍    🙂    😐    🙁                   │
│                                             │
│ Heeft u vragen? Neem contact op.            │
│                                             │
│ Met vriendelijke groet,                     │
│ Tijn                                        │
│ Lavans Service Team                         │
│                                             │
│ Lavans B.V.                                 │
│ 🌐 www.lavans.nl | ✉️ info@lavans.nl       │
└─────────────────────────────────────────────┘
```

---

## 🔄 Samenvatting

**Nieuw in deze versie:**
- ✅ **Activiteitentabel** met scores (juist/verbetering)
- ✅ **Gegroepeerde aandachtspunten** per categorie (Matten, Wissers, etc.)
- ✅ **Contactpersonen mutaties** overzicht
- ✅ **Klantenportaal toegang** tabel met status
- ✅ **Interactieve feedback** via emoji links
- ✅ **Uitgebreidere uitleg** van wat we controleren

**Klant ziet:**
- ✅ Complete score per productgroep
- ✅ Gedetailleerde verbeterpunten met locatie
- ✅ Welke contactpersonen zijn bij/afgemeld
- ✅ Portal toegang status per persoon
- ✅ Mogelijkheid om direct feedback te geven
- ✅ Persoonlijke en vriendelijke toon

**Klant ziet NIET:**
- ❌ Technische details (barcodes, IDs)
- ❌ Interne codes/nummers
- ❌ Exacte ligplaats (alleen afdeling)
- ❌ Concurrentie informatie
- ❌ Email adressen van andere contacten

---

## 🚀 Voordelen Nieuwe Template

1. **Transparanter**: Klant ziet direct een score-overzicht
2. **Actionable**: Concrete tips per categorie
3. **Persoonlijker**: Meer context en uitleg
4. **Interactiever**: Feedback mogelijkheid ingebouwd
5. **Informatief**: Pro-tips over klantenportaal
6. **Completer**: Ook contactpersoon mutaties zichtbaar

---

**Resultaat:** Een uitgebreide, informatieve en klantgerichte email die professioneel en persoonlijk overkomt!

