IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Categories] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NULL,
    CONSTRAINT [PK_Categories] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Runners] (
    [Id] int NOT NULL IDENTITY,
    [FullName] nvarchar(max) NOT NULL,
    [Age] int NOT NULL,
    [Goal] nvarchar(max) NULL,
    [CategoryId] int NOT NULL,
    CONSTRAINT [PK_Runners] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Runners_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([Id]) ON DELETE CASCADE
);
GO

IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Description', N'Name') AND [object_id] = OBJECT_ID(N'[Categories]'))
    SET IDENTITY_INSERT [Categories] ON;
INSERT INTO [Categories] ([Id], [Description], [Name])
VALUES (1, N'Corredores principiantes', N'Inicial'),
(2, NULL, N'Intermedio'),
(3, NULL, N'Avanzado'),
(4, NULL, N'Competición');
IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Description', N'Name') AND [object_id] = OBJECT_ID(N'[Categories]'))
    SET IDENTITY_INSERT [Categories] OFF;
GO

CREATE INDEX [IX_Runners_CategoryId] ON [Runners] ([CategoryId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260112134725_InitialCreate', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260112135741_AddPlannedWorkouts', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [PlannedWorkouts] (
    [Id] int NOT NULL IDENTITY,
    [Date] date NOT NULL,
    [Type] nvarchar(max) NOT NULL,
    [Notes] nvarchar(max) NULL,
    [TargetDistanceKm] decimal(18,2) NULL,
    [TargetDurationMin] int NULL,
    [CategoryId] int NULL,
    [RunnerId] int NULL,
    CONSTRAINT [PK_PlannedWorkouts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_PlannedWorkouts_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_PlannedWorkouts_Runners_RunnerId] FOREIGN KEY ([RunnerId]) REFERENCES [Runners] ([Id]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_PlannedWorkouts_CategoryId] ON [PlannedWorkouts] ([CategoryId]);
GO

CREATE INDEX [IX_PlannedWorkouts_RunnerId] ON [PlannedWorkouts] ([RunnerId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260112142501_FixPlannedWorkoutsTable', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [WorkoutLogs] (
    [Id] int NOT NULL IDENTITY,
    [Date] date NOT NULL,
    [RunnerId] int NOT NULL,
    [PlannedWorkoutId] int NULL,
    [DistanceKm] decimal(18,2) NOT NULL,
    [DurationMin] int NOT NULL,
    [Rpe] int NOT NULL,
    [HadPain] bit NOT NULL,
    [Notes] nvarchar(max) NULL,
    CONSTRAINT [PK_WorkoutLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WorkoutLogs_PlannedWorkouts_PlannedWorkoutId] FOREIGN KEY ([PlannedWorkoutId]) REFERENCES [PlannedWorkouts] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_WorkoutLogs_Runners_RunnerId] FOREIGN KEY ([RunnerId]) REFERENCES [Runners] ([Id]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_WorkoutLogs_PlannedWorkoutId] ON [WorkoutLogs] ([PlannedWorkoutId]);
GO

CREATE INDEX [IX_WorkoutLogs_RunnerId] ON [WorkoutLogs] ([RunnerId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260112150350_AddWorkoutLogs', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [TrainingEvents] (
    [Id] int NOT NULL IDENTITY,
    [Date] date NOT NULL,
    [Time] time NOT NULL,
    [Title] nvarchar(max) NOT NULL,
    [Location] nvarchar(max) NULL,
    [Notes] nvarchar(max) NULL,
    [CategoryId] int NULL,
    CONSTRAINT [PK_TrainingEvents] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_TrainingEvents_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [Attendances] (
    [Id] int NOT NULL IDENTITY,
    [TrainingEventId] int NOT NULL,
    [RunnerId] int NOT NULL,
    [Status] int NOT NULL,
    [Note] nvarchar(max) NULL,
    CONSTRAINT [PK_Attendances] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Attendances_Runners_RunnerId] FOREIGN KEY ([RunnerId]) REFERENCES [Runners] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Attendances_TrainingEvents_TrainingEventId] FOREIGN KEY ([TrainingEventId]) REFERENCES [TrainingEvents] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_Attendances_RunnerId] ON [Attendances] ([RunnerId]);
GO

CREATE UNIQUE INDEX [IX_Attendances_TrainingEventId_RunnerId] ON [Attendances] ([TrainingEventId], [RunnerId]);
GO

CREATE INDEX [IX_TrainingEvents_CategoryId] ON [TrainingEvents] ([CategoryId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260112162221_AddTrainingEventsAndAttendance', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Notifications] (
    [Id] int NOT NULL IDENTITY,
    [CreatedAtUtc] datetime2 NOT NULL,
    [RunnerId] int NULL,
    [Type] nvarchar(max) NOT NULL,
    [Title] nvarchar(max) NOT NULL,
    [Message] nvarchar(max) NOT NULL,
    [IsRead] bit NOT NULL,
    [ReadAtUtc] datetime2 NULL,
    [TrainingEventId] int NULL,
    [PlannedWorkoutId] int NULL,
    CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Notifications_Runners_RunnerId] FOREIGN KEY ([RunnerId]) REFERENCES [Runners] ([Id]) ON DELETE SET NULL
);
GO

CREATE INDEX [IX_Notifications_RunnerId_IsRead_CreatedAtUtc] ON [Notifications] ([RunnerId], [IsRead], [CreatedAtUtc]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260112163743_AddNotifications', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260130014403_AddRunnerIsActive', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Runners] ADD [IsActive] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260130022214_AddRunnerIsActiveColumn', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Categories] ADD [IsActive] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

UPDATE [Categories] SET [IsActive] = CAST(1 AS bit)
WHERE [Id] = 1;
SELECT @@ROWCOUNT;

GO

UPDATE [Categories] SET [IsActive] = CAST(1 AS bit)
WHERE [Id] = 2;
SELECT @@ROWCOUNT;

GO

UPDATE [Categories] SET [IsActive] = CAST(1 AS bit)
WHERE [Id] = 3;
SELECT @@ROWCOUNT;

GO

UPDATE [Categories] SET [IsActive] = CAST(1 AS bit)
WHERE [Id] = 4;
SELECT @@ROWCOUNT;

GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260202204830_AddIsActiveToCategory', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [TrainingEvents] ADD [IsActive] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260202231144_AddIsActiveToTrainingEvent', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Runners] ADD [Dni] nvarchar(9) NULL;
GO

UPDATE dbo.Runners SET Dni = NULL WHERE Dni = ''
GO


        CREATE UNIQUE INDEX IX_Runners_Dni
        ON dbo.Runners (Dni)
        WHERE Dni IS NOT NULL AND Dni <> ''
    
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260203185054_AddRunnerDniColumn', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP INDEX [IX_Runners_Dni] ON [Runners];
GO

DECLARE @var0 sysname;
SELECT @var0 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Runners]') AND [c].[name] = N'Dni');
IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [Runners] DROP CONSTRAINT [' + @var0 + '];');
ALTER TABLE [Runners] ALTER COLUMN [Dni] nvarchar(450) NULL;
GO

CREATE UNIQUE INDEX [IX_Runners_Dni] ON [Runners] ([Dni]) WHERE [Dni] IS NOT NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260204175446_AddUniqueAttendanceByEventRunner', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP INDEX [IX_WorkoutLogs_RunnerId] ON [WorkoutLogs];
GO

ALTER TABLE [WorkoutLogs] ADD [TrainingEventId] int NULL;
GO

CREATE UNIQUE INDEX [IX_WorkoutLogs_RunnerId_TrainingEventId] ON [WorkoutLogs] ([RunnerId], [TrainingEventId]) WHERE [TrainingEventId] IS NOT NULL;
GO

CREATE INDEX [IX_WorkoutLogs_TrainingEventId] ON [WorkoutLogs] ([TrainingEventId]);
GO

ALTER TABLE [WorkoutLogs] ADD CONSTRAINT [FK_WorkoutLogs_TrainingEvents_TrainingEventId] FOREIGN KEY ([TrainingEventId]) REFERENCES [TrainingEvents] ([Id]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260205195943_AddTrainingEventIdToWorkoutLogs', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Runners] ADD [BillingCycleDays] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Runners] ADD [EmacDeliveredAt] datetime2 NULL;
GO

ALTER TABLE [Runners] ADD [EmacValidUntil] datetime2 NULL;
GO

ALTER TABLE [Runners] ADD [GraceDays] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Runners] ADD [LastPaymentDate] datetime2 NULL;
GO

ALTER TABLE [Runners] ADD [TermsAcceptedAt] datetime2 NULL;
GO

ALTER TABLE [Runners] ADD [TermsVersion] nvarchar(max) NULL;
GO

ALTER TABLE [Runners] ADD [WaiverDeliveredAt] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260217125146_AddMembershipFieldsToRunner', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Runners] ADD [BirthDate] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260220014841_AddRunnerBirthDate', N'8.0.11');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [WorkoutLogs] ADD [EditCount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [WorkoutLogs] ADD [SubmittedAtUtc] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
GO

ALTER TABLE [WorkoutLogs] ADD [UpdatedAtUtc] datetime2 NULL;
GO

ALTER TABLE [Attendances] ADD [EditCount] int NOT NULL DEFAULT 0;
GO

ALTER TABLE [Attendances] ADD [SubmittedAtUtc] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
GO

ALTER TABLE [Attendances] ADD [UpdatedAtUtc] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260221173321_AddEditTrackingToWorkoutAndAttendance', N'8.0.11');
GO

COMMIT;
GO

