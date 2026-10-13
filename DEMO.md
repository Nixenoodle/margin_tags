# Margin Tags demo

Place the cursor in this paragraph. Its tags should stay inline for editing. #editing #demo

Click the paragraph above. These tags should move to the right. Use +N to see the overflow, then click a tag to search. #project #research #design #planning #team/europe #follow-up #a-long-tag-that-will-overflow

This paragraph has two source lines. #writing
Moving the cursor into either line should reveal both tags. #review

- First list item, with its own tag lane. #todo #priority/high
  A continuation line belongs to the first item. #next
- Second list item, with a separate tag lane. #done

## A tagged heading #heading

Nested and non-English tags should remain clickable. #work/project #æble #日本語

Repeated tags appear once in the lane. #repeat #repeat

Inline code should not become a margin tag: `#not-a-tag`.

```text
#also-not-a-tag
```

| Example | State |
| --- | --- |
| Table tags remain inline | #table |

#one #two #three #four #five #six #seven

Select across several paragraphs to reveal all their inline tags. Switching to Source mode or disabling Margin Tags should restore normal presentation everywhere.

Priority check: choose Left to right or Right to left in settings. These should display as first → middle → last, or last → middle → first. #first #middle #last

Inline fields stay inline when **Keep inline-field tags inline** is enabled:

tags:: #source/book #status/reading #processing

Ordinary #margin-tag with [status:: #reading] and (topic:: #science).
