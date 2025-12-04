# 📧 Email Opties - Service Rapport

Je hebt nu **2 manieren** om klanten te informeren over een service bezoek!

---

## 🎯 Optie 1: Korte Notificatie Email ⚡ (NIEUW!)

**Concept:** Simpele notificatie + link naar volledige rapport op webpagina

### ✅ Voordelen
- 📱 **Mobiel vriendelijk** - korte, overzichtelijke email
- 📊 **Trackable** - zie wie het rapport bekijkt
- ⚡ **Sneller te lezen** - geen lange scroll
- 🎯 **Hogere open rate** - minder overweldigend

### 📧 Wat krijgt de klant te zien?

```
┌──────────────────────────────────┐
│   [LAVANS LOGO]                  │
│                                  │
│   ✅ Service Bezoek Afgerond     │
│                                  │
│   Beste [Naam],                  │
│   We hebben een service bezoek   │
│   uitgevoerd bij [Klant].        │
│                                  │
│   📅 Datum: 14 november 2025     │
│   👤 Inspecteur: Tijn            │
│                                  │
│   [STATUS BADGE]                 │
│   🎉 Alles in orde!              │
│   of                             │
│   ⚠️ 3 aandachtspunten           │
│                                  │
│   ┌──────┐  ┌──────┐            │
│   │  12  │  │  3   │            │
│   │Items │  │Punten│            │
│   └──────┘  └──────┘            │
│                                  │
│   Wil je het volledige rapport  │
│   bekijken met alle details?    │
│                                  │
│   [📄 Bekijk Volledig Rapport]  │
│        (GROTE KNOP)              │
│                                  │
│   Met vriendelijke groet,        │
│   Tijn                           │
│   Lavans Service Team            │
└──────────────────────────────────┘
```

### 🔗 Rapport Pagina

Wanneer klant op de knop klikt:
```
https://agreeable-bush-0adda8c03.3.azurestaticapps.net/rapport/{inspectieID}
```

**Krijgt te zien:**
- 📋 Volledig service rapport
- 📊 Activiteitentabel met scores
- ⚠️ Alle aandachtspunten gedetailleerd
- 👥 Contactpersonen wijzigingen
- 💡 Klantenportaal toegang info
- 😍 Feedback mogelijkheid

### 🚀 Hoe te gebruiken?

**Via API:**
```javascript
POST /api/send-inspectie-email
{
  "inspectieID": 123,
  "emailType": "short"  // ← Dit is de magic!
}
```

**Response:**
```json
{
  "success": true,
  "message": "Korte notificatie email succesvol verzonden!",
  "recipient": "klant@example.com",
  "emailType": "short",
  "rapportUrl": "https://.../rapport/123"
}
```

---

## 📄 Optie 2: Volledig Rapport Email 📊

**Concept:** Alle details direct in de email (bestaande template)

### ✅ Voordelen
- 📧 **Alles in 1 keer** - geen extra klik nodig
- 💾 **Bewaarbaar** - klant heeft alles in mailbox
- 🖨️ **Printbaar** - direct printen mogelijk
- 📱 **Offline leesbaar** - geen internet nodig

### 📧 Wat krijgt de klant te zien?

Volledige email met:
- 📋 **Introductie** - Wat hebben we gedaan?
- 📊 **Activiteitentabel** - Scores per categorie
- ✅ **Wat is juist?** - Uitleg criteria
- ⚠️ **Aandachtspunten** - Gedetailleerd per categorie
- 👥 **Contactwijzigingen** - Wie is bij/afgemeld
- 💡 **Klantenportaal** - Toegang overzicht
- 📝 **Algemene opmerkingen** - Extra notities
- 😍 **Feedback** - Emoji rating

### 🚀 Hoe te gebruiken?

**Via API:**
```javascript
POST /api/send-inspectie-email
{
  "inspectieID": 123,
  "emailType": "full"  // Of laat weg (default)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Volledig rapport email succesvol verzonden!",
  "recipient": "klant@example.com",
  "emailType": "full",
  "rapportUrl": null
}
```

---

## 🤔 Welke Kiezen?

### Kies **KORTE EMAIL** wanneer:
- ✅ Klant is mobiel gebruiker
- ✅ Je wilt zien wie rapport bekijkt
- ✅ Weinig problemen geconstateerd
- ✅ Klant geeft voorkeur aan korte emails
- ✅ Je wilt een moderne, app-achtige ervaring

### Kies **VOLLEDIGE EMAIL** wanneer:
- ✅ Klant wil alles direct in mailbox
- ✅ Veel details om te communiceren
- ✅ Klant heeft slechte internet verbinding
- ✅ Email moet bewaard worden voor archief
- ✅ Klant is gewend aan uitgebreide rapporten

---

## 🎨 Design Details

### Korte Email
- **Onderwerp:** `✅ Service Bezoek Afgerond - [Klantnaam]`
- **Stijl:** Modern, mobiel-first, centered layout
- **Kleuren:** Blauw gradient CTA button
- **Grootte:** ~5KB (klein!)
- **Load tijd:** < 1 seconde

### Volledige Email
- **Onderwerp:** `Service Rapport - [Klantnaam] (datum)`
- **Stijl:** Professioneel, sectie-gebaseerd
- **Kleuren:** Kleurgecodeerde secties
- **Grootte:** ~15-25KB
- **Load tijd:** 1-2 seconden

---

## 🔒 Privacy & Beveiliging

### Rapport Pagina Security
- ✅ **Publiek toegankelijk** via unieke URL
- ✅ **Geen gevoelige data** zoals barcodes, prijzen
- ✅ **Geen authenticatie** vereist (klant-vriendelijk)
- ⚠️ **URL is "geheim"** - alleen wie email krijgt kent URL

**Tip:** InspectieID's zijn numeriek en opvolgend. Voor extra security zou je een **UUID** kunnen toevoegen:
```
/rapport/123/a7b3c4d5-e6f7-8901-2345-67890abcdef
```

---

## 📊 Tracking & Analytics

Met de **korte email** optie kun je tracken:

```sql
-- Hoeveel emails verzonden vs rapporten bekeken?
SELECT 
    COUNT(*) as EmailsVerzonden,
    SUM(CASE WHEN rapport_bekeken = 1 THEN 1 ELSE 0 END) as RapportenBekeken
FROM Inspecties
WHERE InspectieDatum >= '2025-01-01'
```

*(Je zou een tabel log kunnen toevoegen die bijhoudt wanneer rapport pagina wordt bezocht)*

---

## 🚀 Snelle Start

### Stap 1: Deployment Wachten
Wacht 2-3 minuten tot Azure de nieuwe versie heeft gedeployed.

### Stap 2: Test Korte Email
```bash
curl -X POST https://agreeable-bush-0adda8c03.3.azurestaticapps.net/api/send-inspectie-email \
  -H "Content-Type: application/json" \
  -d '{"inspectieID": 123, "emailType": "short"}'
```

### Stap 3: Test Rapport Pagina
Open in browser:
```
https://agreeable-bush-0adda8c03.3.azurestaticapps.net/rapport/123
```

### Stap 4: Test Volledige Email
```bash
curl -X POST https://agreeable-bush-0adda8c03.3.azurestaticapps.net/api/send-inspectie-email \
  -H "Content-Type: application/json" \
  -d '{"inspectieID": 123, "emailType": "full"}'
```

---

## 🎯 Aanbeveling

**Start met KORTE EMAIL!**

Redenen:
- ✅ Modernere gebruikservaring
- ✅ Betere mobiele ervaring
- ✅ Makkelijker te testen (open rapport pagina in browser)
- ✅ Klant kan altijd nog alles zien (via link)
- ✅ Lagere email server load

**Switch naar volledige email** voor klanten die er expliciet om vragen.

---

## 📞 Support

Vragen over de nieuwe email opties?
- 📧 Check `EMAIL_CONTENT.md` voor content details
- 🔧 Check `AZURE_CONFIG.md` voor SMTP setup
- 🚀 Check `BREVO_SETUP.md` voor email service

---

**🎉 Veel succes met de nieuwe email functionaliteit!**

