using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RunTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMembershipFieldsToRunner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BillingCycleDays",
                table: "Runners",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "EmacDeliveredAt",
                table: "Runners",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EmacValidUntil",
                table: "Runners",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GraceDays",
                table: "Runners",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastPaymentDate",
                table: "Runners",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TermsAcceptedAt",
                table: "Runners",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TermsVersion",
                table: "Runners",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "WaiverDeliveredAt",
                table: "Runners",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BillingCycleDays",
                table: "Runners");

            migrationBuilder.DropColumn(
                name: "EmacDeliveredAt",
                table: "Runners");

            migrationBuilder.DropColumn(
                name: "EmacValidUntil",
                table: "Runners");

            migrationBuilder.DropColumn(
                name: "GraceDays",
                table: "Runners");

            migrationBuilder.DropColumn(
                name: "LastPaymentDate",
                table: "Runners");

            migrationBuilder.DropColumn(
                name: "TermsAcceptedAt",
                table: "Runners");

            migrationBuilder.DropColumn(
                name: "TermsVersion",
                table: "Runners");

            migrationBuilder.DropColumn(
                name: "WaiverDeliveredAt",
                table: "Runners");
        }
    }
}
