using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RunTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkoutLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    RunnerId = table.Column<int>(type: "int", nullable: false),
                    PlannedWorkoutId = table.Column<int>(type: "int", nullable: true),
                    DistanceKm = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DurationMin = table.Column<int>(type: "int", nullable: false),
                    Rpe = table.Column<int>(type: "int", nullable: false),
                    HadPain = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutLogs_PlannedWorkouts_PlannedWorkoutId",
                        column: x => x.PlannedWorkoutId,
                        principalTable: "PlannedWorkouts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_WorkoutLogs_Runners_RunnerId",
                        column: x => x.RunnerId,
                        principalTable: "Runners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutLogs_PlannedWorkoutId",
                table: "WorkoutLogs",
                column: "PlannedWorkoutId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutLogs_RunnerId",
                table: "WorkoutLogs",
                column: "RunnerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkoutLogs");
        }
    }
}
