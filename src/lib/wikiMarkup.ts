/**
 * 원문 마크업의 오타 때문에 이미지가 글자로 보이는 경우를 "그릴 때만" 보정한다.
 * 저장된 본문(people.json)은 원문 그대로 두고, 여기서는 글 내용을 건드리지 않는다.
 */
export function repairMarkup(content: string) {
  return (
    content
      // 4칸 이상 들여쓴 <img> 는 마크다운 코드 블록이 되어 태그가 그대로 보인다
      .replace(/^[ \t]{4,}(?=<img\b)/gm, '   ')
      // style="width: 20%";/> 처럼 따옴표 뒤에 붙은 세미콜론은 태그를 깨뜨린다
      .replace(/(<img\b[^>]*")\s*;\s*(\/?>)/g, '$1$2')
  );
}
