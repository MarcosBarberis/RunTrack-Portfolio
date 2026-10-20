using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RunTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSelfRegisteredFieldsToWorkoutLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Note",
                table: "Attendances");

            migrationBuilder.AddColumn<bool>(
                name: "IsSelfRegistered",
                table: "WorkoutLogs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SelfRegisteredTitle",
                table: "WorkoutLogs",
                type: "nvarchar(100)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSelfRegistered",
                table: "WorkoutLogs");

            migrationBuilder.DropColumn(
                name: "SelfRegisteredTitle",
                table: "WorkoutLogs");

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "Attendances",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
