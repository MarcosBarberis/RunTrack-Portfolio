using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RunTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueAttendanceByEventRunner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Runners_Dni",
                table: "Runners");

            migrationBuilder.AlterColumn<string>(
                name: "Dni",
                table: "Runners",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateIndex(
                name: "IX_Runners_Dni",
                table: "Runners",
                column: "Dni",
                unique: true,
                filter: "[Dni] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Runners_Dni",
                table: "Runners");

            migrationBuilder.AlterColumn<string>(
                name: "Dni",
                table: "Runners",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Runners_Dni",
                table: "Runners",
                column: "Dni",
                unique: true);
        }
    }
}
