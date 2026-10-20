using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RunTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEditTrackingToWorkoutAndAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EditCount",
                table: "WorkoutLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedAtUtc",
                table: "WorkoutLogs",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "WorkoutLogs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EditCount",
                table: "Attendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedAtUtc",
                table: "Attendances",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "Attendances",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EditCount",
                table: "WorkoutLogs");

            migrationBuilder.DropColumn(
                name: "SubmittedAtUtc",
                table: "WorkoutLogs");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "WorkoutLogs");

            migrationBuilder.DropColumn(
                name: "EditCount",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "SubmittedAtUtc",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "Attendances");
        }
    }
}
