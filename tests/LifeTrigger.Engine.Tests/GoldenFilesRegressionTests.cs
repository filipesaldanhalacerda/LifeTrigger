using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Application.Services;
using LifeTrigger.Engine.Domain.Entities;
using Xunit;
using Xunit.Abstractions;
using LifeTrigger.Engine.Tests.GoldenFiles;
using System.IO;
using System.Threading.Tasks;

namespace LifeTrigger.Engine.Tests;

public class GoldenFilesRegressionTests
{
    private readonly ILifeInsuranceCalculator _calculator;
    private readonly ITestOutputHelper _output;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter() }
    };

    public GoldenFilesRegressionTests(ITestOutputHelper output)
    {
        _calculator = new LifeInsuranceCalculator();
        _output = output;
        
        // Ensure ExpectedOutputs folder exists
        Directory.CreateDirectory("GoldenFiles/ExpectedOutputs");
    }

    [Theory]
    [InlineData("NoDependentsAvgIncomeNoDebt", nameof(TestScenarios.NoDependentsAvgIncomeNoDebt))]
    [InlineData("OneDependentModerateDebt", nameof(TestScenarios.OneDependentModerateDebt))]
    [InlineData("TwoDependentsHighDebt", nameof(TestScenarios.TwoDependentsHighDebt))]
    [InlineData("HighEmergencyFund", nameof(TestScenarios.HighEmergencyFund))]
    [InlineData("NoEmergencyFund", nameof(TestScenarios.NoEmergencyFund))]
    [InlineData("OverInsuredReduzir", nameof(TestScenarios.OverInsuredReduzir))]
    [InlineData("LowerGuardrail2x", nameof(TestScenarios.LowerGuardrail2x))]
    [InlineData("NeedsReviewOver12Months", nameof(TestScenarios.NeedsReviewOver12Months))]
    [InlineData("TriggerNasceuFilho", nameof(TestScenarios.TriggerNasceuFilho))]
    [InlineData("TriggerRendaSubiu", nameof(TestScenarios.TriggerRendaSubiu))]
    [InlineData("TriggerFinanciamentoNovo", nameof(TestScenarios.TriggerFinanciamentoNovo))]
    [InlineData("ZeroCurrentCoverage", nameof(TestScenarios.ZeroCurrentCoverage))]
    [InlineData("UpperGuardrail20x", nameof(TestScenarios.UpperGuardrail20x))]
    public async Task DeterministicCore_MustMatchGoldenFilesOutputExactly(string scenarioName, string methodName)
    {
        // 1. Arrange Input
        var methodInfo = typeof(TestScenarios).GetMethod(methodName);
        var inputRequest = (LifeTrigger.Engine.Domain.Entities.LifeInsuranceAssessmentRequest)methodInfo!.Invoke(null, null)!;

        // 2. Act Core Calculator
        var result = _calculator.Calculate(inputRequest);

        // Strip execution timestamps that drift per run to allow pure deterministic hash checks
        var deterministicResult = result with { 
            Audit = result.Audit with { Timestamp = DateTimeOffset.MinValue },
            // Temporarily ignore the hardcoded RuleSet versions in this comparison if we only want pure calculations
            // RegrasAplicadas should ideally be checked if they were generated.
        };

        var actualJson = JsonSerializer.Serialize(deterministicResult, JsonOptions);
        var filePath = $"GoldenFiles/ExpectedOutputs/{scenarioName}.json";

        // 3. Golden File logic: If file doesn't exist, create it (First Run / Record Mode)
        // In CI/CD, this should fail if file is missing, but for local dev we auto-generate base.
        if (!File.Exists(filePath))
        {
            _output.WriteLine($"[RECORDING] Golden file not found for {scenarioName}. Creating initial expected output.");
            await File.WriteAllTextAsync(filePath, actualJson);
        }

        // 4. Assert
        var expectedJson = await File.ReadAllTextAsync(filePath);
        
        actualJson.Should().Be(expectedJson, 
            because: $"The deterministic output for {scenarioName} must match the agreed Golden File byte-by-byte. If deliberate rules changed, you must update the Golden file.");
    }
}
