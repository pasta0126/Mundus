namespace Mundus.Core;

/// <summary>
/// Deterministic RNG core: any seed (string or number) must always produce
/// the exact same sequence, on any machine, forever. This is the invariant
/// the whole app is built on - never swap in <see cref="Random"/> anywhere
/// downstream of a seed.
/// </summary>
public sealed class Rng
{
    private uint _state;

    public Rng(string seed) : this(Xmur3(seed)) { }

    public Rng(uint seed)
    {
        _state = seed;
    }

    /// <summary>xmur3: hashes an arbitrary string into a 32-bit integer seed.</summary>
    private static uint Xmur3(string str)
    {
        uint h = 1779033703u ^ (uint)str.Length;
        foreach (var c in str)
        {
            h ^= c;
            h *= 3432918353u;
            h = (h << 13) | (h >> 19);
        }
        h ^= h >> 16;
        h *= 2246822507u;
        h ^= h >> 13;
        h *= 3266489909u;
        h ^= h >> 16;
        return h;
    }

    /// <summary>mulberry32: fast, small-state PRNG producing floats in [0, 1).</summary>
    private double NextDouble()
    {
        _state += 0x6d2b79f5u;
        var t = _state;
        t = (t ^ (t >> 15)) * (t | 1u);
        t ^= t + (t ^ (t >> 7)) * (t | 61u);
        return ((t ^ (t >> 14)) & 0xFFFFFFFFu) / 4294967296.0;
    }

    /// <summary>Float in [0, 1).</summary>
    public double Float() => NextDouble();

    /// <summary>Integer in [min, max], inclusive on both ends.</summary>
    public int Int(int min, int max)
    {
        if (max < min) throw new ArgumentOutOfRangeException(nameof(max), $"max ({max}) < min ({min})");
        return min + (int)(Float() * (max - min + 1));
    }

    /// <summary>true with probability p (default 0.5).</summary>
    public bool Bool(double p = 0.5) => Float() < p;

    /// <summary>Uniformly random element of a non-empty list.</summary>
    public T Pick<T>(IReadOnlyList<T> items)
    {
        if (items.Count == 0) throw new ArgumentException("items is empty", nameof(items));
        return items[Int(0, items.Count - 1)];
    }

    public readonly record struct WeightedItem<T>(T Value, double Weight);

    /// <summary>Weighted pick: weights are relative, need not sum to 1.</summary>
    public T Weighted<T>(IReadOnlyList<WeightedItem<T>> items)
    {
        var total = items.Sum(i => i.Weight);
        var roll = Float() * total;
        foreach (var item in items)
        {
            roll -= item.Weight;
            if (roll <= 0) return item.Value;
        }
        return items[^1].Value;
    }

    /// <summary>Fisher-Yates shuffle; returns a new list, does not mutate the input.</summary>
    public List<T> Shuffle<T>(IReadOnlyList<T> items)
    {
        var result = items.ToList();
        for (var i = result.Count - 1; i > 0; i--)
        {
            var j = Int(0, i);
            (result[i], result[j]) = (result[j], result[i]);
        }
        return result;
    }

    /// <summary>
    /// Derives an independent child <see cref="Rng"/> for a named sub-stream
    /// (e.g. "biome", "size"). Same parent seed + same name always yields
    /// the same child sequence, but different names don't leak into each
    /// other's rolls - this keeps generation steps decoupled so adding a
    /// new step doesn't reshuffle the results of earlier ones. Call order
    /// of Child() against the same parent is part of the frozen contract
    /// for a seed - always append new child streams, never insert them
    /// between existing ones.
    /// </summary>
    public Rng Child(string name)
    {
        var derivedSeed = (uint)Int(0, int.MaxValue);
        return new Rng($"{derivedSeed}:{name}");
    }
}
