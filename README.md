# Reward Calendar

[![PHPUnit test](https://github.com/tuhin-sheikh-cmc/tuhin-test/actions/workflows/phpunit.yml/badge.svg)](https://github.com/tuhin-sheikh-cmc/tuhin-test/actions/workflows/phpunit.yml)

Managing rewards for the kids for doing some good things like:

- good manner
- house chores

For each good deed, kids will get reward points from parents. For each bad deed, parent would be able to deduct reward points. There will be some perks (that parents would be able to define), which would tell them how many reward points would unlock that perk. i.e. parent could set 'eating out' as a perk and set '500' reward points in order for kid/kids to unlock it.

When adding rewards, parents would select a kid (if there are more than one kid), select date and then add reward points (and optional notes). This will then update the reward point for that kid.

## Stage 2 developments

We need following logics for perks (implemented at later stage):
- whether the points should be combined or needs to be achieved individually for each child. i.e. if 500 points set for 'dining out', then whether each kid needs to get 500 points?
- unlocking additional perks or part of additional perks when one of the perk is unlocked? Like if 'dining out' is unlocked, then it might unlock 10% of 'movie night' perk.

## Installation and Config

