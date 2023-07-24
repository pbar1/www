---
title: "Analyzing a Codebase"
pubDatetime: 2017-10-31
description: "Some interesting metrics to run on source text before compilation"
tags: ["software"]
# lastmod: "2019-01-18"
---

_Originally posted for [Clear Measure](https://www.clear-measure.com/)_

Here at Clear Measure we are all about taking old software and making it new again. In doing that, we perform a lot of _code refactoring_ - restructuring old code without breaking its functionality. This could, in some cases, call for some large rewrites of legacy components that still have to play nice with the rest of the system.

But before diving into a project, it would be nice to have a plan of attack, wouldn't it? This is where _code metrics_ come into play. Code metrics are quantitative measurements of a codebase that can provide insights into software architecture. This information can then be used for smart budget planning and allocation of resources. A popular code metric is _lines of code_, or LOC for short. Naturally, codebases with more lines of code will turn into larger refactoring projects.

Another one of these code metrics is _cyclomatic complexity_ - the number of independent paths through the code. Roughly speaking, the number of paths through the code correspounds to the number of unit tests that the code needs. To calculate the cyclomatic complexity, most commercial programs require the .NET source code to be complied into an assembly.

When analyzing a codebase before beginning a refactoring project, many times the code cannot - for whatever reason - compile to an assembly. This could be because key pieces of the solution are broken or missing, and fixing or writing them from scratch at this stage in the project is out of scope. Wouldn't it be nice if you could get a quick overview of the codebase from the source code only, no assembly required?

As we do a lot of refactoring at Clear Measure, automating the process of gathering these metrics means more productivity. The faster we can get a grasp on the code, the faster we can get to work on a solution! For this reason, I wrote a PowerShell script to analyze a repository of code for lines of code, cyclomatic complexity, and file type.

### Lines of Code

This is the easist measurement to perform on your code with PowerShell. For example, to enumerate and print out the lines of C# code across all files in a folder, the PowerShell script looks like this:

```powershell
$loc: 0
Get-ChildItem -Include "*.cs" -Recurse |
ForEach-Object {
    $loc += (Get-Content $_ | Measure-Object -Line).Lines
}
Write-Host $loc
```

This script drills down and finds all of the `.cs` files in the current working directory recursively and aggregates their collective total number of lines. Of course, the `.cs` may be substituted for the extension of any other type of source code, such as `.py` for Python, `.vb` for Visual Basic, and so on.

### Cyclomatic Complexity

A reasonable estimate of cyclomatic complexity can be obtained by counting up the total number of branching statements in the code. For C# code, the branching statements that count toward this total are as follows:

* if
* for
* foreach
* while
* catch

It is unnecessary to include `else`, as it does not spawn a new branch, but rather follows the default path through the code. Using `if` as an example, the PowerShell script looks like this:

```powershell
$cyclo: 0
Get-ChildItem -Include "*.cs" -Recurse |
ForEach-Object {
    $cyclo += (Get-Content $_ | Select-String -Pattern " if(" -SimpleMatch -AllMatches).Count
    $cyclo += (Get-Content $_ | Select-String -Pattern " if (" -SimpleMatch -AllMatches).Count
    # ...and so on for the rest of the branching statements
}
Write-Host $cyclo
```

This script works similarly to the the one for lines of code, with the key difference being that it increments a count every time it sees a branching statement in a `.cs` file. To get the full cyclomatic complexity estimate, simply include lines for each of the remaining branching statements in the script.

### Wrapping Up

Lines of code and cyclomatic complexity are not the only metrics that can be collected using PowerShell. With a little imagination and patience, other measurements such as dependency analysis could be performed. This is because source code is simply text, which is easy to work with. So get out there and start scripting away!
