namespace RunTrack.Api.Domain.Entities
{
    public class Runner
    {
        public int Id { get; set; }

        public string FullName { get; set; } = null!;
        public int Age { get; set; }
        public DateTime? BirthDate { get; set; } // solo fecha (sin hora relevante)

        public string? Goal { get; set; } // 5K, 10K, salud, etc.

        public bool IsActive { get; set; } = true;
        public string? Dni { get; set; } 
        public int CategoryId { get; set; }
        public Category Category { get; set; } = null!;

        public int CurrentStreak { get; set; }
        public int BestStreak { get; set; }

        public DateTime? LastPaymentDate { get; set; }
        public int BillingCycleDays { get; set; } = 30;
        public int GraceDays { get; set; } = 7;

        public DateTime? WaiverDeliveredAt { get; set; }
        public DateTime? EmacDeliveredAt { get; set; }
        public DateTime? EmacValidUntil { get; set; }  // opcional calculado pero guardado

        public DateTime? TermsAcceptedAt { get; set; }
        public string? TermsVersion { get; set; }

    }
}
