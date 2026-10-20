using System.ComponentModel.DataAnnotations;

namespace RunTrack.Api.Contracts
{
    public class SelfWorkoutCreateDto
    {
        public DateOnly Date { get; set; }

        [Required]
        [StringLength(100)]
        public string Title { get; set; } = null!;

        public decimal DistanceKm { get; set; }
        public int DurationMin { get; set; }
        public int Rpe { get; set; }
        public bool HadPain { get; set; }
        public string? Notes { get; set; }
    }
}
