---
title: Security Groups in Terraform
url: /security-groups-in-terraform/
date: '2019-01-17'
draft: false
tags: []
comments: {}
---
Terraform is a great tool by Hashicorp that allows teams to keep track of their infrastructure's state and manage it declaratively in code. One of its biggest use cases is in managing the ever-increasing amount of AWS resources, one of which is the bread and butter of cloud networking: the *security group*.

Security groups in AWS are simply lists of rules (topping out at 50 rules per group) that can whitelist traffic according to port, CIDR block, and most interestingly other security groups' IDs. For example, one could envison an RDS cluster with a security group called `rds-sg` attached to it, and an Autoscaling group with one called `rds-client-sg` attached to it. In this scenario, `rds-sg` has rules allowing traffic in from each client security group identified by their ID as opposed to CIDR block/IP range. This provides better observability when troubleshooting connectivity issues as well as flexibility when writing Terraform. Security groups are stateful, meaning that any traffic allowed in is also allowed back out.

When perusing the Terraform docs, one may notice that there are two ways to provision security group resources:

- `aws_security_group` with rules defined inline
- `aws_security_group` + `aws_security_group_rule`

At first glance, these two look the same - not so. The key differene is that they _cannot be used together_, ie. you can't define rules inline _and_ with `aws_security_group_rule`. If you do so, Terraform will continuously say that it has changes to make on `terraform plan` and `apply`, never to be satisfied. You have to either pick one or the other.

This is because when you define security group rules inline, you are in essence telling Terraform "I want you to take full ownership of the state of this security group". Normally, this is preferrable behavior. If a rogue user goes off and manually modifies a security group that is managed by Terraform, then the next time a plan is run it will be caught and reverted to what is in the resource definition.

Sometimes, however, you have security groups that just can't bend to this ideal. A prime example is when standing up an Elastic Kubernetes Service (EKS) cluster. The architecture boils down to this:

- EKS cluster, with a security group `eks-cluster-sg`
- Any number of EKS node pools, with security groups such as `eks-node-general-sg`

In order to build this architecture as extensible as possible, you end up with two Terraform modules: `eks-cluster` and `eks-node`. The EKS cluster must exist before the nodes because they need the cluster's certificate authority data to authenticate. This in turn means that _the cluster's security group must exist before the nodes are created_. Do you see where this is going?

The cluster's security group must allow egress/ingress to/from the node pools (`general` from above), but such rules cannot be added inline at EKS cluster create time - the node pools do not exist yet. Thus, this rule creation must be defered to node pool create time! The workflow goes:

- Create EKS cluster and `eks-cluster-sg` with no rules inline
- Create node pool, passing in the ID of `eks-cluster-sg` (hopefully exported by the `eks-cluster` module)
  - Attach rules to `eks-cluster-sg` allowing `eks-node-general-sg` in and out
- Repeat for each node pool

The code should look something like this:

```terraform
module "eks-cluster" {
  # ...
}

module "eks-node-general" {
  ca_data    = "${module.eks-cluster.ca_data}"
  cluster_sg = "${module.eks-cluster.cluster_sg}"
  # ...
}
```

And you've got yourself a working EKS cluster with the minimum possible network traffic allowed. Although with a caveat: `eks-cluster-sg` can be added to manually (such as in the AWS console by hand) and Terraform would be **none the wiser**. So not really ideal.

TL;DR:
Use `aws_security_group` with inline rules. If you need to add rules asynchronously, then use `aws_security_group_rule`.
