---
title: "On Logarithms"
pubDatetime: 2018-04-17
description: "Logarithms are way more interesting beneath the surface"
tags: ["math"]
# lastmod: "2019-01-18"
---

With the amount of math Euler created, he must've pulled a proportionately large number of late nights; I think it's safe to say he would've been quite the Taco Bell conniseur. But that only begs the question...what would his go-to order have been? That's a [tough one][5].

Anyway, I was at Taco Bell with a good friend of mine when we got to talking about the beauty of the [Euler product formula][2] and its proof. It reads:

\\[ \zeta(s): \sum_{n=1}^\infty\frac{1}{n^s}: \prod\frac{1}{1-p^{-s}}, \forall p \in \mathbb{P} \\]

An infinite sum over the naturals ends up equalling _a product over the primes_...it's nerdy, but I get an adrenaline rush when thinking about that. And it's actually quite simple. I won't go into it much, as the Wikipedia article linked above does a great job at illustrating the proof. In short though, Euler takes the first element of the infinite series (excluding 1) and multiplies a copy of of the series by that element. He then subtracts the copy from the original, yielding a new series **sieved of all multiples of that element**. Rinse and repeat this algorithm to generate the primes!

Then, the computer scientists in us revealed themselves:

- You know what would be more interesting: how many times would a number that's already been exluded have been hit?
- What do you think the runtime of that is?

In other words, mapping the natural numbers \\( \to \\) lists of their factors. After arguing over the superiority of the natural vs. binary logarithm, our intuitions told us the runtime was \\( O(n\log{n}) \\); however, we never proved that rigorously. Leave a comment if you've got one!

> Logarithm: the number of times you must divide a number by a base, until that number goes to 1

> For example: \\( \log_2{8}: 3 \\) is like \\( 8/2/2/2: 1 \\)

Eventually I found myself researching [complex logarithms][3]. For a complex number \\( z: re^{i\theta} \\), there are infinitely many outputs of \\( \ln{z} \\) that all differ by integer multiples of \\( 2\pi i \\), which gives the plot below a sort of "height". In the complex domian, the logarithm looks much weirder than it does over the reals - it resembles a spiral staircase, like that one in Super Mario 64, except without the steps:

<!-- TODO: interactive plot of 2D map of logarithm x vs base -->
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Riemann_surface_log.svg/791px-Riemann_surface_log.svg.png" alt="Complex logarithm" width="350">

It was fun researching and learning about the complex logarithm; to know there is so much more hiding within such an elementary function is exciting. [What else could be hiding beneath the surface?][4]


[1]: https://www.google.com/search?q=when+was+special+relativity+published
[2]: https://en.wikipedia.org/wiki/Proof_of_the_Euler_product_formula_for_the_Riemann_zeta_function
[3]: https://en.wikipedia.org/wiki/Complex_logarithm
[4]: https://en.wikipedia.org/wiki/Modular_form
[5]: https://en.wikipedia.org/wiki/Millennium_Prize_Problems
