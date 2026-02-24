using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LifeTrigger.Engine.Domain.ValueObjects;

public enum RuleArgType { String, Int, Decimal, Bool }

/// <summary>
/// A strict primitive wrapper ensuring only deterministic primitives can enter the structured justification log.
/// Defends against `object` causing varied serialization (e.g. double vs decimal padding).
/// </summary>
[JsonConverter(typeof(RuleArgValueConverter))]
public readonly record struct RuleArgValue
{
    public RuleArgType Type { get; }
    public string? StringValue { get; }
    public int? IntValue { get; }
    public decimal? DecimalValue { get; }
    public bool? BoolValue { get; }

    private RuleArgValue(RuleArgType type, string? s, int? i, decimal? d, bool? b)
    {
        Type = type;
        StringValue = s;
        IntValue = i;
        DecimalValue = d;
        BoolValue = b;
    }

    public static implicit operator RuleArgValue(string value) => new(RuleArgType.String, value, null, null, null);
    public static implicit operator RuleArgValue(int value) => new(RuleArgType.Int, null, value, null, null);
    public static implicit operator RuleArgValue(decimal value) => new(RuleArgType.Decimal, null, null, value, null);
    public static implicit operator RuleArgValue(bool value) => new(RuleArgType.Bool, null, null, null, value);

    public object GetValue() => Type switch
    {
        RuleArgType.String => StringValue!,
        RuleArgType.Int => IntValue!,
        RuleArgType.Decimal => DecimalValue!,
        RuleArgType.Bool => BoolValue!,
        _ => throw new InvalidOperationException("Unknown RuleArgType")
    };
    
    public override string ToString()
    {
        return Type switch
        {
            RuleArgType.String => StringValue!,
            RuleArgType.Int => IntValue!.Value.ToString(System.Globalization.CultureInfo.InvariantCulture),
            RuleArgType.Decimal => DecimalValue!.Value.ToString(System.Globalization.CultureInfo.InvariantCulture),
            RuleArgType.Bool => BoolValue!.Value.ToString(System.Globalization.CultureInfo.InvariantCulture),
            _ => string.Empty
        };
    }
}

public class RuleArgValueConverter : JsonConverter<RuleArgValue>
{
    public override RuleArgValue Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String) return reader.GetString()!;
        if (reader.TokenType == JsonTokenType.Number) 
        {
            if (reader.TryGetInt32(out int i)) return i;
            if (reader.TryGetDecimal(out decimal d)) return d;
        }
        if (reader.TokenType == JsonTokenType.True) return true;
        if (reader.TokenType == JsonTokenType.False) return false;
        throw new JsonException("Unsupported RuleArgValue format found during deserialization.");
    }

    public override void Write(Utf8JsonWriter writer, RuleArgValue value, JsonSerializerOptions options)
    {
        switch (value.Type)
        {
            case RuleArgType.String:
                writer.WriteStringValue(value.StringValue);
                break;
            case RuleArgType.Int:
                writer.WriteNumberValue(value.IntValue!.Value);
                break;
            case RuleArgType.Decimal:
                // System.Text.Json WriteNumberValue(decimal) preserves decimal structure and writes pure numbers.
                writer.WriteNumberValue(value.DecimalValue!.Value);
                break;
            case RuleArgType.Bool:
                writer.WriteBooleanValue(value.BoolValue!.Value);
                break;
        }
    }
}
