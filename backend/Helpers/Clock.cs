namespace Mamnungs.Api.Helpers;

public static class Clock
{
    private static readonly TimeZoneInfo Tz = FindZone();

    public static DateTime NowJakarta => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Tz);
    public static DateOnly TodayJakarta => DateOnly.FromDateTime(NowJakarta);

    // Awal dan akhir satu hari (waktu Jakarta) dalam UTC, untuk filter ke database
    public static (DateTime StartUtc, DateTime EndUtc) DayRangeUtc(DateOnly day)
    {
        var local = DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        var start = TimeZoneInfo.ConvertTimeToUtc(local, Tz);
        return (start, start.AddDays(1));
    }

    // Rentang beberapa hari (kedua ujung termasuk), akhirnya eksklusif
    public static (DateTime StartUtc, DateTime EndUtc) RangeUtc(DateOnly from, DateOnly to)
    {
        var (start, _) = DayRangeUtc(from);
        var (_, end) = DayRangeUtc(to);
        return (start, end);
    }

    // Waktu dari database (UTC) ke waktu Jakarta
    public static DateTime ToJakarta(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Tz);

    public static DateOnly ToJakartaDate(DateTime utc) => DateOnly.FromDateTime(ToJakarta(utc));

    // Menandai waktu dari database sebagai UTC agar JSON-nya berakhiran "Z"
    public static DateTime AsUtc(DateTime d) => DateTime.SpecifyKind(d, DateTimeKind.Utc);

    private static TimeZoneInfo FindZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Jakarta"); }
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"); }
    }
}