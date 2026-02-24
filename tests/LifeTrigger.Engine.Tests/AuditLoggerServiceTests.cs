using System;
using FluentAssertions;
using LifeTrigger.Engine.Application.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace LifeTrigger.Engine.Tests;

public class AuditLoggerServiceTests
{
    private readonly AuditLoggerService _sut;

    public AuditLoggerServiceTests()
    {
        _sut = new AuditLoggerService(new NullLogger<AuditLoggerService>());
    }

    [Theory]
    [InlineData("12345678", "****5678")]
    [InlineData("1234567890", "******7890")]
    [InlineData("ABCD", "****")]
    [InlineData("A", "*")]
    [InlineData("", "")]
    [InlineData(null, "")]
    public void MaskString_ReturnsCorrectlyMaskedValue(string original, string expected)
    {
        // Act
        var result = _sut.MaskString(original);

        // Assert
        result.Should().Be(expected);
    }
}
