# LFCS Notes

Notes and practice material for the Linux Foundation Certified System Administrator (LFCS) exam. The material follows the current curriculum: five domains, 2 hours, 17-20 hands-on tasks, 67% to pass.

Start with the [study plan](./PLAN.md). It has the 6-week schedule, a log for mistakes, and a table that maps every curriculum competency to notes, quizzes, labs and mock tasks.

## Notes

1. [Essential Commands](./01-essential-commands.md) (20%)
2. [Operations Deployment](./02-operations-deployment.md) (25%)
3. [Users and Groups](./03-users-and-groups.md) (10%)
4. [Networking](./04-networking.md) (25%)
5. [Storage](./05-storage.md) (20%)

[Extensions](./99-extensions.md): RAID and disk quotas, which are no longer in the curriculum. Read them later.

## Practice

- [Quizzes](./quizzes/): recall questions per domain, with answers hidden in collapsible blocks
- [Labs](./labs/): a Vagrant lab of 4 VMs ([setup](./labs/00-environment.md)) and hands-on tasks per domain, each with a verify step and a hidden solution
- [Mock exams](./mock/): three timed 20-task exams. Each has a setup script, an automatic grader and solutions

```bash
cd labs && VAGRANT_EXPERIMENTAL=disks vagrant up && vagrant snapshot save clean
vagrant ssh base
bash /lfcs/mock/setup-mock-1.sh     # then solve mock/mock-1.md in 2 hours
bash /lfcs/mock/check-mock-1.sh     # score per task
```
