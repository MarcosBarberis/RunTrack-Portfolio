using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RunTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainingEventsAndAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TrainingEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Time = table.Column<TimeOnly>(type: "time", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Location = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CategoryId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrainingEvents_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Attendances",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TrainingEventId = table.Column<int>(type: "int", nullable: false),
                    RunnerId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attendances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Attendances_Runners_RunnerId",
                        column: x => x.RunnerId,
                        principalTable: "Runners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Attendances_TrainingEvents_TrainingEventId",
                        column: x => x.TrainingEventId,
                        principalTable: "TrainingEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_RunnerId",
                table: "Attendances",
                column: "RunnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_TrainingEventId_RunnerId",
                table: "Attendances",
                columns: new[] { "TrainingEventId", "RunnerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrainingEvents_CategoryId",
                table: "TrainingEvents",
                column: "CategoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Attendances");

            migrationBuilder.DropTable(
                name: "TrainingEvents");
        }
    }
}
