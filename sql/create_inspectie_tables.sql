-- =============================================
-- Script: Maak Inspectie Tabellen
-- Beschrijving: Tabellen voor opslaan van inspectie data
-- =============================================

-- Tabel 1: Inspectie headers
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Inspecties')
BEGIN
    DROP TABLE dbo.Inspecties;
END
GO

CREATE TABLE dbo.Inspecties (
    InspectieID INT IDENTITY(1,1) PRIMARY KEY,
    Relatienummer NVARCHAR(50) NOT NULL,
    Klantnaam NVARCHAR(200),
    Contactpersoon NVARCHAR(200),
    ContactEmail NVARCHAR(200),
    Inspecteur NVARCHAR(100),
    InspectieDatum DATE,
    InspectieTijd TIME,
    AangemaaktOp DATETIME DEFAULT GETDATE(),
    Status NVARCHAR(50) DEFAULT 'Afgerond'
);

CREATE INDEX IX_Inspecties_Relatienummer ON dbo.Inspecties(Relatienummer);
CREATE INDEX IX_Inspecties_Datum ON dbo.Inspecties(InspectieDatum DESC);
GO

-- Tabel 2: Standaard Matten checks
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'InspectieStandaardMatten')
BEGIN
    DROP TABLE dbo.InspectieStandaardMatten;
END
GO

CREATE TABLE dbo.InspectieStandaardMatten (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    InspectieID INT NOT NULL,
    MatType NVARCHAR(200),
    Afdeling NVARCHAR(100),
    Ligplaats NVARCHAR(100),
    Aantal INT,
    Aanwezig BIT,
    SchoonOnbeschadigd BIT,
    Vuilgraad NVARCHAR(50),
    CONSTRAINT FK_StandaardMatten_Inspectie FOREIGN KEY (InspectieID) 
        REFERENCES dbo.Inspecties(InspectieID) ON DELETE CASCADE
);

CREATE INDEX IX_StandaardMatten_InspectieID ON dbo.InspectieStandaardMatten(InspectieID);
GO

-- Tabel 3: Logomatten checks
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'InspectieLogomatten')
BEGIN
    DROP TABLE dbo.InspectieLogomatten;
END
GO

CREATE TABLE dbo.InspectieLogomatten (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    InspectieID INT NOT NULL,
    MatType NVARCHAR(200),
    Afdeling NVARCHAR(100),
    Ligplaats NVARCHAR(100),
    Aantal INT,
    Aanwezig BIT,
    SchoonOnbeschadigd BIT,
    Vuilgraad NVARCHAR(50),
    Barcode NVARCHAR(50),
    Leeftijd NVARCHAR(50),
    CONSTRAINT FK_Logomatten_Inspectie FOREIGN KEY (InspectieID) 
        REFERENCES dbo.Inspecties(InspectieID) ON DELETE CASCADE
);

CREATE INDEX IX_Logomatten_InspectieID ON dbo.InspectieLogomatten(InspectieID);
GO

-- Tabel 4: Wissers checks
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'InspectieWissers')
BEGIN
    DROP TABLE dbo.InspectieWissers;
END
GO

CREATE TABLE dbo.InspectieWissers (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    InspectieID INT NOT NULL,
    Artikel NVARCHAR(200),
    AantalGeteld INT,
    WaarvanGebruikt INT,
    CONSTRAINT FK_Wissers_Inspectie FOREIGN KEY (InspectieID) 
        REFERENCES dbo.Inspecties(InspectieID) ON DELETE CASCADE
);

CREATE INDEX IX_Wissers_InspectieID ON dbo.InspectieWissers(InspectieID);
GO

-- Tabel 5: Toebehoren checks
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'InspectieToebehoren')
BEGIN
    DROP TABLE dbo.InspectieToebehoren;
END
GO

CREATE TABLE dbo.InspectieToebehoren (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    InspectieID INT NOT NULL,
    Artikel NVARCHAR(200),
    Vervangen BIT,
    Aantal INT,
    CONSTRAINT FK_Toebehoren_Inspectie FOREIGN KEY (InspectieID) 
        REFERENCES dbo.Inspecties(InspectieID) ON DELETE CASCADE
);

CREATE INDEX IX_Toebehoren_InspectieID ON dbo.InspectieToebehoren(InspectieID);
GO

-- Tabel 6: Concurrenten info
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'InspectieConcurrenten')
BEGIN
    DROP TABLE dbo.InspectieConcurrenten;
END
GO

CREATE TABLE dbo.InspectieConcurrenten (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    InspectieID INT NOT NULL,
    AndereMatAanwezig NVARCHAR(10),
    AndereMatConcurrent NVARCHAR(200),
    AantalConcurrent INT,
    AantalKoop INT,
    WissersConcurrent NVARCHAR(10),
    WissersConcurrentNaam NVARCHAR(200),
    AndereZaken NVARCHAR(MAX),
    CONSTRAINT FK_Concurrenten_Inspectie FOREIGN KEY (InspectieID) 
        REFERENCES dbo.Inspecties(InspectieID) ON DELETE CASCADE
);

CREATE INDEX IX_Concurrenten_InspectieID ON dbo.InspectieConcurrenten(InspectieID);
GO

-- Tabel 7: Algemene feedback en extra velden
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'InspectieAlgemeen')
BEGIN
    DROP TABLE dbo.InspectieAlgemeen;
END
GO

CREATE TABLE dbo.InspectieAlgemeen (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    InspectieID INT NOT NULL,
    VeldNaam NVARCHAR(100),
    VeldWaarde NVARCHAR(MAX),
    CONSTRAINT FK_Algemeen_Inspectie FOREIGN KEY (InspectieID) 
        REFERENCES dbo.Inspecties(InspectieID) ON DELETE CASCADE
);

CREATE INDEX IX_Algemeen_InspectieID ON dbo.InspectieAlgemeen(InspectieID);
GO

-- Tabel 8: API Logging voor debugging
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ApiLogs')
BEGIN
    CREATE TABLE dbo.ApiLogs (
        LogID INT IDENTITY(1,1) PRIMARY KEY,
        Timestamp DATETIME DEFAULT GETDATE(),
        Endpoint NVARCHAR(100),
        Method NVARCHAR(10),
        StatusCode INT,
        RequestBody NVARCHAR(MAX),
        ResponseBody NVARCHAR(MAX),
        ErrorMessage NVARCHAR(MAX),
        DurationMs INT,
        InspectieID INT NULL
    );
    
    CREATE INDEX IX_ApiLogs_Timestamp ON dbo.ApiLogs(Timestamp DESC);
    CREATE INDEX IX_ApiLogs_Endpoint ON dbo.ApiLogs(Endpoint);
END
GO

PRINT 'Inspectie tabellen succesvol aangemaakt!';
PRINT 'Controleer met: SELECT * FROM dbo.ApiLogs ORDER BY Timestamp DESC;';
GO

