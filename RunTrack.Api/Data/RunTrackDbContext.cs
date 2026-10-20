using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Domain.Entities;


namespace RunTrack.Api.Data
{
    public class RunTrackDbContext : DbContext
    {
        public RunTrackDbContext(DbContextOptions<RunTrackDbContext> options)
            : base(options) { }

        public DbSet<Category> Categories => Set<Category>();
        public DbSet<Runner> Runners => Set<Runner>();
        public DbSet<PlannedWorkout> PlannedWorkouts => Set<PlannedWorkout>();
        public DbSet<WorkoutLog> WorkoutLogs => Set<WorkoutLog>();
        public DbSet<TrainingEvent> TrainingEvents => Set<TrainingEvent>();
        public DbSet<Attendance> Attendances => Set<Attendance>();
        public DbSet<Notification> Notifications => Set<Notification>();





        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Category>().HasData(
                new Category { Id = 1, Name = "Inicial", Description = "Corredores principiantes" },
                new Category { Id = 2, Name = "Intermedio" },
                new Category { Id = 3, Name = "Avanzado" },
                new Category { Id = 4, Name = "Competición" }

  
            );
            modelBuilder.Entity<PlannedWorkout>()
                .HasOne(p => p.Category)
                .WithMany()
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PlannedWorkout>()
                .HasOne(p => p.Runner)
                .WithMany()
                .HasForeignKey(p => p.RunnerId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<WorkoutLog>()
                .HasOne(w => w.Runner)
                .WithMany()
                .HasForeignKey(w => w.RunnerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<WorkoutLog>()
                .HasOne(w => w.PlannedWorkout)
                .WithMany()
                .HasForeignKey(w => w.PlannedWorkoutId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<TrainingEvent>()
                .HasOne(e => e.Category)
                .WithMany()
                .HasForeignKey(e => e.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.TrainingEvent)
                .WithMany()
                .HasForeignKey(a => a.TrainingEventId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Runner)
                .WithMany()
                .HasForeignKey(a => a.RunnerId)
                .OnDelete(DeleteBehavior.Restrict);

            // Evitar duplicados: un corredor solo 1 registro por evento
            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.TrainingEventId, a.RunnerId })
                .IsUnique();

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.Runner)
                .WithMany()
                .HasForeignKey(n => n.RunnerId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Notification>()
                .HasIndex(n => new { n.RunnerId, n.IsRead, n.CreatedAtUtc });

            modelBuilder.Entity<Runner>()
                 .HasIndex(r => r.Dni)
                 .IsUnique();

            modelBuilder.Entity<Runner>()
                .HasIndex(r => r.Dni)
                .IsUnique()
                .HasFilter("[Dni] IS NOT NULL");

            modelBuilder.Entity<Attendance>()
                 .HasIndex(a => new { a.TrainingEventId, a.RunnerId })
                 .IsUnique();

            modelBuilder.Entity<WorkoutLog>()
                 .HasIndex(x => new { x.RunnerId, x.TrainingEventId })
                 .IsUnique()
                 .HasFilter("[TrainingEventId] IS NOT NULL");



        }

    }
}
