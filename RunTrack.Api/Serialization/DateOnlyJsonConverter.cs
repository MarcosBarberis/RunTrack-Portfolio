using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RunTrack.Api.Serialization
{
    public sealed class DateOnlyJsonConverter : JsonConverter<DateOnly>
    {
        private const string Format = "yyyy-MM-dd";

        public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var s = reader.GetString();
            if (string.IsNullOrEmpty(s)) throw new JsonException("Invalid date");

            if (DateOnly.TryParseExact(s, Format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
                return d;

            if (DateOnly.TryParse(s, out d))
                return d;

            throw new JsonException($"Unable to parse DateOnly from '{s}'");
        }

        public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString(Format, CultureInfo.InvariantCulture));
        }
    }
}
