using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class RngTests
{
    [Fact]
    public void SameSeedProducesSameSequence()
    {
        var a = new Rng("hello-world");
        var b = new Rng("hello-world");
        var seqA = Enumerable.Range(0, 20).Select(_ => a.Float()).ToList();
        var seqB = Enumerable.Range(0, 20).Select(_ => b.Float()).ToList();
        Assert.Equal(seqA, seqB);
    }

    [Fact]
    public void DifferentSeedsDiverge()
    {
        var a = new Rng("seed-1");
        var b = new Rng("seed-2");
        var seqA = Enumerable.Range(0, 10).Select(_ => a.Float()).ToList();
        var seqB = Enumerable.Range(0, 10).Select(_ => b.Float()).ToList();
        Assert.NotEqual(seqA, seqB);
    }

    [Fact]
    public void FloatStaysWithinBounds()
    {
        var rng = new Rng("bounds-check");
        for (var i = 0; i < 1000; i++)
        {
            var v = rng.Float();
            Assert.InRange(v, 0.0, 1.0 - double.Epsilon);
        }
    }

    [Fact]
    public void IntRespectsInclusiveBounds()
    {
        var rng = new Rng("int-bounds");
        for (var i = 0; i < 500; i++)
        {
            var v = rng.Int(5, 8);
            Assert.InRange(v, 5, 8);
        }
    }

    [Fact]
    public void PickOnlyReturnsItemsFromTheList()
    {
        var items = new List<string> { "a", "b", "c" };
        var rng = new Rng("pick-test");
        for (var i = 0; i < 100; i++)
        {
            Assert.Contains(rng.Pick(items), items);
        }
    }

    [Fact]
    public void ShuffleIsAPermutationAndDoesNotMutateInput()
    {
        var original = new List<int> { 1, 2, 3, 4, 5 };
        var rng = new Rng("shuffle-test");
        var shuffled = rng.Shuffle(original);

        Assert.Equal([1, 2, 3, 4, 5], original);
        Assert.Equal(original.OrderBy(x => x), shuffled.OrderBy(x => x));
    }

    [Fact]
    public void ChildStreamsAreDeterministicAndIndependent()
    {
        var parentA = new Rng("parent-seed");
        var parentB = new Rng("parent-seed");

        var childA1 = parentA.Child("alpha");
        var childA2 = parentA.Child("beta");
        var childB1 = parentB.Child("alpha");

        Assert.Equal(childB1.Float(), childA1.Float());
        Assert.NotEqual(childA2.Float(), childA1.Float());
    }
}
