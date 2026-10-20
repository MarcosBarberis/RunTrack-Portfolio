using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RunTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRunnerDniColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1) Agregar columna DNI como nullable (para no romper con runners existentes)
            migrationBuilder.AddColumn<string>(
                name: "Dni",
                table: "Runners",
                type: "nvarchar(9)",
                nullable: true);

            // 2) Por las dudas, limpiar vacíos (si llegara a existir alguno)
            migrationBuilder.Sql("UPDATE dbo.Runners SET Dni = NULL WHERE Dni = ''");

            // 3) Índice único filtrado: permite múltiples NULL y evita duplicados reales
            migrationBuilder.Sql(@"
        CREATE UNIQUE INDEX IX_Runners_Dni
        ON dbo.Runners (Dni)
        WHERE Dni IS NOT NULL AND Dni <> ''
    ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS IX_Runners_Dni ON dbo.Runners;");
            migrationBuilder.DropColumn(
                name: "Dni",
                table: "Runners");
        }
    }
}
