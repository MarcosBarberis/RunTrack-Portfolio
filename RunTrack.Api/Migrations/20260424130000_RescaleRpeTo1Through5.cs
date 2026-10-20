using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RunTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class RescaleRpeTo1Through5 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rescale RPE values from 1-10 range to 1-5 range
            // Formula: rpe_new = CEILING(rpe_old / 2.0)
            // This ensures:
            // 1-2 -> 1, 3-4 -> 2, 5-6 -> 3, 7-8 -> 4, 9-10 -> 5
            migrationBuilder.Sql(
                @"UPDATE [WorkoutLogs]
                  SET [Rpe] = CEILING(CAST([Rpe] AS FLOAT) / 2.0)
                  WHERE [Rpe] > 5");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reverse the rescaling (though this may not perfectly restore original values)
            // Just cap everything to 5 as a safe rollback
            migrationBuilder.Sql(
                @"UPDATE [WorkoutLogs]
                  SET [Rpe] = CASE
                    WHEN [Rpe] > 5 THEN 5
                    ELSE [Rpe]
                  END");
        }
    }
}
