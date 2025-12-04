PRINT 'Aanmaken tabel InspectieRapportTokens...';
GO

IF OBJECT_ID('dbo.InspectieRapportTokens', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.InspectieRapportTokens (
    InspectieID     INT              NOT NULL,
    Token           UNIQUEIDENTIFIER NOT NULL,
    GeldigTot       DATETIME2(0)     NOT NULL,
    Used            BIT              NOT NULL CONSTRAINT DF_InspectieRapportTokens_Used DEFAULT (0),
    CreatedAt       DATETIME2(0)     NOT NULL CONSTRAINT DF_InspectieRapportTokens_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_InspectieRapportTokens PRIMARY KEY CLUSTERED (InspectieID, Token)
  );
END
ELSE
BEGIN
  PRINT 'Tabel InspectieRapportTokens bestaat al, wordt niet opnieuw aangemaakt.';
END
GO

PRINT '';
PRINT '-- Recente rapport-tokens bekijken:';
PRINT 'SELECT TOP 50 InspectieID, Token, GeldigTot, Used, CreatedAt';
PRINT 'FROM dbo.InspectieRapportTokens';
PRINT 'ORDER BY CreatedAt DESC;';
GO


