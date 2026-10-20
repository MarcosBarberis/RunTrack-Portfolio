using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RunTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixPlannedWorkoutsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlannedWorkouts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TargetDistanceKm = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    TargetDurationMin = table.Column<int>(type: "int", nullable: true),
                    CategoryId = table.Column<int>(type: "int", nullable: true),
                    RunnerId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlannedWorkouts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlannedWorkouts_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlannedWorkouts_Runners_RunnerId",
                        column: x => x.RunnerId,
                        principalTable: "Runners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlannedWorkouts_CategoryId",
                table: "PlannedWorkouts",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PlannedWorkouts_RunnerId",
                table: "PlannedWorkouts",
                column: "RunnerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlannedWorkouts");
        }
    }
}
