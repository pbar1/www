import lume from "lume/mod.ts";
import blog from "blog/mod.ts";

// Additional prism languages
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-csharp.js";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-hcl.js";
import "prismjs/components/prism-powershell.js";
import "prismjs/components/prism-yaml.js";

const site = lume();

site.use(blog());

export default site;
