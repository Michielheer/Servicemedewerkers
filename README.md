# Lavans Service App

Een Streamlit-applicatie voor servicemedewerkers van Lavans om matten en wissers te inspecteren.

## Functionaliteiten

- Selecteren van klanten op basis van relatienummer
- Automatisch ophalen van contactpersonen
- Inspectieformulier voor matten en wissers
- Gedetailleerde registratie van vuilgraad per mat/wisser
- AI-gegenereerde rapportage
- PDF/HTML export van rapporten

## Installatie

1. Clone deze repository
2. Installeer de vereiste packages:
   ```
   pip install -r requirements.txt
   ```
3. Maak een `.env` bestand met de volgende variabelen:
   ```
   SUPABASE_URL=jouw_supabase_url
   SUPABASE_KEY=jouw_supabase_key
   OPENAI_API_KEY=jouw_openai_api_key
   ```
4. Start de app:
   ```
   streamlit run app.py
   ```

## Deployment

Deze app kan worden gedeployed via Streamlit Cloud of op een eigen server.

## Ontwikkeld door

Michiel Heerkens voor Lavans

```python
import login

login.require_login()
# ... rest van je app ... 