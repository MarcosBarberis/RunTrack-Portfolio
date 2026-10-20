using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RunTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainingEventIdToWorkoutLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkoutLogs_RunnerId",
                table: "WorkoutLogs");

            migrationBuilder.AddColumn<int>(
                name: "TrainingEventId",
                table: "WorkoutLogs",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutLogs_RunnerId_TrainingEventId",
                table: "WorkoutLogs",
                columns: new[] { "RunnerId", "TrainingEventId" },
                unique: true,
                filter: "[TrainingEventId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutLogs_TrainingEventId",
                table: "WorkoutLogs",
                column: "TrainingEventId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutLogs_TrainingEvents_TrainingEventId",
                table: "WorkoutLogs",
                column: "TrainingEventId",
                principalTable: "TrainingEvents",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutLogs_TrainingEvents_TrainingEventId",
                table: "WorkoutLogs");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutLogs_RunnerId_TrainingEventId",
                table: "WorkoutLogs");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutLogs_TrainingEventId",
                table: "WorkoutLogs");

            migrationBuilder.DropColumn(
                name: "TrainingEventId",
                table: "WorkoutLogs");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutLogs_RunnerId",
                table: "WorkoutLogs",
                column: "RunnerId");
        }
    }
}
