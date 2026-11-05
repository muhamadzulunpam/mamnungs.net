using System.Text.RegularExpressions;

namespace Mamnungs.Api.Helpers;

public static class Slug
{
    public static string From(string text) =>
        Regex.Replace(text.Trim().ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
}