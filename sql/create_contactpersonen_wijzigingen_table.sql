-- =============================================
-- Script: Maak ContactpersonenWijzigingen Tabel
-- Beschrijving: Log alle wijzigingen aan contactpersonen
-- =============================================

-- Verwijder bestaande tabel indien aanwezig
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ContactpersonenWijzigingen')
BEGIN
    DROP TABLE dbo.ContactpersonenWijzigingen;
END
GO

-- Maak nieuwe tabel
CREATE TABLE dbo.ContactpersonenWijzigingen (
    WijzigingID INT IDENTITY(1,1) PRIMARY KEY,
    Relatienummer NVARCHAR(50) NOT NULL,
    Klantnaam NVARCHAR(200),
    Inspecteur NVARCHAR(100),
    WijzigingType NVARCHAR(50) NOT NULL, -- 'toevoegen', 'wijzigen', 'verwijderen'
    ContactVoornaam NVARCHAR(100),
    ContactTussenvoegsel NVARCHAR(50),
    ContactAchternaam NVARCHAR(100),
    ContactEmail NVARCHAR(200),
    ContactTelefoon NVARCHAR(50),
    ContactFunctie NVARCHAR(100),
    Routecontact BIT DEFAULT 0,
    NogInDienst BIT DEFAULT 1,
    Klantenportaal NVARCHAR(100),
    Omschrijving NVARCHAR(MAX), -- Vrije tekst voor extra context
    WijzigingDatum DATETIME DEFAULT GETDATE(),
    Verwerkt BIT DEFAULT 0, -- Voor klantenservice: is wijziging verwerkt in CRM?
    VerwerktDoor NVARCHAR(100),
    VerwerktOp DATETIME
);

-- Indexes voor performance
CREATE INDEX IX_ContactWijzigingen_Relatienummer ON dbo.ContactpersonenWijzigingen(Relatienummer);
CREATE INDEX IX_ContactWijzigingen_Datum ON dbo.ContactpersonenWijzigingen(WijzigingDatum DESC);
CREATE INDEX IX_ContactWijzigingen_Type ON dbo.ContactpersonenWijzigingen(WijzigingType);
CREATE INDEX IX_ContactWijzigingen_Verwerkt ON dbo.ContactpersonenWijzigingen(Verwerkt) WHERE Verwerkt = 0;

GO

PRINT 'ContactpersonenWijzigingen tabel succesvol aangemaakt!';
PRINT '';
PRINT '-- Voorbeeld queries:';
PRINT '';
PRINT '-- Alle recente wijzigingen:';
PRINT 'SELECT TOP 20 * FROM dbo.ContactpersonenWijzigingen ORDER BY WijzigingDatum DESC;';
PRINT '';
PRINT '-- Onverwerkte wijzigingen voor klantenservice:';
PRINT 'SELECT * FROM dbo.ContactpersonenWijzigingen WHERE Verwerkt = 0 ORDER BY WijzigingDatum DESC;';
PRINT '';
PRINT '-- Wijzigingen per klant:';
PRINT 'SELECT Klantnaam, COUNT(*) AS AantalWijzigingen FROM dbo.ContactpersonenWijzigingen';
PRINT 'GROUP BY Klantnaam ORDER BY AantalWijzigingen DESC;';
GO

