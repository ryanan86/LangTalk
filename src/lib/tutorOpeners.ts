export interface TutorOpener {
  text: string;
  translationKo: string;
}

const RECENT_OPENERS_KEY = 'langtalk_recent_openers';
const MAX_RECENT = 5;

const openersByTutor: Record<string, TutorOpener[]> = {
  emma: [
    { text: "Oh my god, I just had the most amazing ramen! Have you had good ramen lately?", translationKo: "세상에, 방금 진짜 맛있는 라면 먹었어! 너 요즘 맛있는 라면 먹었어?" },
    { text: "Wait, I literally just found the cutest cafe. Do you have a favorite cafe?", translationKo: "잠깐, 나 진짜 너무 예쁜 카페 찾았어. 너 좋아하는 카페 있어?" },
    { text: "I'm so obsessed with this new song right now. What kind of music are you into?", translationKo: "나 요즘 이 노래에 완전 빠졌어. 너는 어떤 음악 좋아해?" },
    { text: "Omg, so I was watching this K-drama last night and I can't stop thinking about it!", translationKo: "세상에, 어젯밤에 한국 드라마 봤는데 계속 생각나!" },
    { text: "No way, I just tried making kimchi fried rice and it actually turned out amazing!", translationKo: "말도 안 돼, 나 방금 김치볶음밥 만들었는데 진짜 맛있게 됐어!" },
    { text: "Okay but like, what's the best thing that happened to you this week?", translationKo: "근데 말이야, 이번 주에 가장 좋았던 일이 뭐야?" },
    { text: "I literally cannot decide what to eat for dinner. What's your go-to comfort food?", translationKo: "나 진짜 저녁 뭐 먹을지 못 정하겠어. 너 최고의 위로 음식이 뭐야?" },
    { text: "Lowkey, I've been wanting to learn something new. Have you picked up any new hobbies?", translationKo: "은근히, 나 새로운 거 배우고 싶었어. 너 요즘 새로 시작한 취미 있어?" },
    { text: "Oh btw, I just binge-watched an entire series this weekend. Are you watching anything good?", translationKo: "아 참, 나 이번 주말에 시리즈 한 편 다 봤어. 너 요즘 뭐 재밌는 거 보고 있어?" },
    { text: "Wait what, you know what I realized? I haven't traveled in forever. Where would you go right now?", translationKo: "잠깐, 나 방금 깨달았어. 여행 안 간 지 너무 오래됐어. 지금 어디 가고 싶어?" },
  ],
  james: [
    { text: "Dude, I just played this crazy new game. You into games at all?", translationKo: "야, 나 방금 미친 새 게임 했어. 너 게임 좋아해?" },
    { text: "Bro, I had the best burger of my life yesterday. What's your favorite food?", translationKo: "야, 어제 인생 버거 먹었어. 너 가장 좋아하는 음식 뭐야?" },
    { text: "That's sick, I just finished a workout and I'm dead. Do you work out?", translationKo: "대박, 방금 운동 끝났는데 완전 죽겠어. 너 운동해?" },
    { text: "No cap, the weather today is amazing. What do you usually do on days like this?", translationKo: "진짜로, 오늘 날씨 미쳤어. 이런 날 보통 뭐 해?" },
    { text: "Dude, I've been binge-watching this show and it's wild. Watching anything good?", translationKo: "야, 나 드라마 한 편 정주행 중인데 미쳤어. 요즘 뭐 재밌는 거 봐?" },
    { text: "So like, random question — if you could eat one thing forever, what would it be?", translationKo: "갑자기 드는 질문인데 — 평생 한 가지만 먹을 수 있으면 뭐 먹을 거야?" },
    { text: "Bro, I legit just woke up from the best nap ever. Are you a nap person?", translationKo: "야, 방금 인생 낮잠에서 일어났어. 너 낮잠 자는 편이야?" },
    { text: "Anyway man, what's been good with you lately? Anything fun going on?", translationKo: "그래서 말인데, 요즘 어때? 재밌는 일 있어?" },
    { text: "Wild, I just tried cooking Korean food for the first time. Do you cook much?", translationKo: "대박, 나 처음으로 한국 음식 만들어 봤어. 너 요리 많이 해?" },
    { text: "Oh random but, I've been thinking about learning a new skill. What would you learn?", translationKo: "아 갑자기 생각난 건데, 새로운 기술 배우고 싶어. 너는 뭘 배우고 싶어?" },
  ],
  charlotte: [
    { text: "Right, so I've just had the most gorgeous cup of coffee. Are you a coffee person?", translationKo: "자, 나 방금 정말 멋진 커피 한 잔 마셨어. 너 커피 좋아하는 편이야?" },
    { text: "Oh god, I've just spent an absolute fortune on books. Do you read much?", translationKo: "세상에, 나 방금 책에 돈을 엄청 썼어. 너 책 많이 읽어?" },
    { text: "Bloody hell, the weather's been proper rubbish. What do you do on rainy days?", translationKo: "세상에, 날씨가 진짜 별로야. 비 오는 날 뭐 해?" },
    { text: "I quite fancy trying a new restaurant this weekend. Got any recommendations?", translationKo: "이번 주말에 새 식당 가보고 싶어. 추천할 곳 있어?" },
    { text: "Right so, I've been watching this absolutely brilliant series. Seen anything good lately?", translationKo: "있지, 나 요즘 진짜 대단한 시리즈 보고 있어. 너 최근에 뭐 재밌는 거 봤어?" },
    { text: "Absolutely love weekends. What's your ideal way to spend a Saturday?", translationKo: "주말이 정말 좋아. 너의 이상적인 토요일은 어떻게 보내는 거야?" },
    { text: "I've had a bit of a rubbish day, actually. What cheers you up when you're feeling down?", translationKo: "사실 오늘 좀 별로인 하루였어. 기분 안 좋을 때 뭐 하면 기분 나아져?" },
    { text: "Anyway, I was just thinking about travel and now I'm desperate for a holiday. Where would you go?", translationKo: "어쨌든, 방금 여행 생각하다가 휴가 가고 싶어 죽겠어. 너는 어디 가고 싶어?" },
    { text: "Proper embarrassing, but I've just discovered a song that's been out for ages. What are you listening to?", translationKo: "좀 창피한데, 나 한참 전에 나온 노래를 이제 발견했어. 너 요즘 뭐 듣고 있어?" },
  ],
  oliver: [
    { text: "Right then, I've just had a proper good meal. What's the best thing you've eaten recently?", translationKo: "자, 나 방금 진짜 맛있는 식사 했어. 최근에 가장 맛있게 먹은 거 뭐야?" },
    { text: "Fair enough if this is a weird question, but what do you do to unwind after a long day?", translationKo: "좀 이상한 질문일 수 있는데, 긴 하루 끝나고 뭐 하면서 쉬어?" },
    { text: "Cheers for chatting with me. So, what's been keeping you busy lately?", translationKo: "나랑 얘기해줘서 고마워. 그래서, 요즘 뭐 하면서 바빠?" },
    { text: "Bit odd, but I've been really into podcasts recently. Are you a podcast person?", translationKo: "좀 그런데, 나 요즘 팟캐스트에 빠졌어. 너 팟캐스트 듣는 편이야?" },
    { text: "Right, so the weekend's coming up. Got any plans or just winging it?", translationKo: "자, 주말이 다가오네. 계획 있어 아니면 그냥 되는 대로?" },
    { text: "Mental, I just realized I haven't properly explored my own city. What's your favorite spot where you live?", translationKo: "미쳤어, 나 내가 사는 도시도 제대로 안 돌아다녀 봤네. 너 사는 곳에서 가장 좋아하는 장소가 어디야?" },
    { text: "Anyway mate, I've been thinking about picking up a new hobby. What do you do for fun?", translationKo: "어쨌든, 나 새 취미를 시작하려고 생각 중이야. 너 뭐 하면서 놀아?" },
    { text: "Proper lazy day today. Do you have guilty pleasure activities for days like this?", translationKo: "오늘 완전 게으른 날이야. 이런 날에 하는 죄책감 드는 즐거움 있어?" },
    { text: "Fair enough, I'll just ask — tea or coffee? It says a lot about a person, I reckon.", translationKo: "그냥 물어볼게 — 차 아니면 커피? 그거 사람에 대해 많이 알려주는 것 같아." },
  ],
  alina: [
    { text: "Hi! Guess what? I saw the cutest puppy today! Do you like dogs or cats more?", translationKo: "안녕! 있잖아! 오늘 진짜 귀여운 강아지 봤어! 너는 강아지랑 고양이 중에 뭐가 더 좋아?" },
    { text: "Oh cool, I just drew the prettiest rainbow! Do you like drawing?", translationKo: "오 멋져, 나 방금 진짜 예쁜 무지개 그렸어! 너 그림 그리는 거 좋아해?" },
    { text: "Yay, it's so nice to talk to you! What's your favorite color?", translationKo: "야호, 너랑 얘기하니까 좋다! 너 좋아하는 색깔이 뭐야?" },
    { text: "That's so fun! I love making friendship bracelets. Do you make crafts?", translationKo: "진짜 재밌다! 나 우정 팔찌 만드는 거 좋아해. 너 만들기 해?" },
    { text: "Awesome! I just had ice cream and it was sooo good. What's your favorite flavor?", translationKo: "대박! 나 방금 아이스크림 먹었는데 진짜 맛있었어. 너 좋아하는 맛이 뭐야?" },
    { text: "Oh oh and, I learned a really cool fact today! Did you know dolphins sleep with one eye open?", translationKo: "아 그리고, 나 오늘 진짜 신기한 거 알았어! 돌고래가 한쪽 눈 뜨고 자는 거 알았어?" },
    { text: "Guess what? My favorite show just got a new season! What do you like to watch?", translationKo: "있잖아! 내가 좋아하는 프로 새 시즌 나왔어! 너는 뭐 보는 거 좋아해?" },
    { text: "I love that! Hey, if you could have any superpower, what would you pick?", translationKo: "나 그거 좋아해! 야, 너 아무 초능력 하나 가질 수 있으면 뭐 고를 거야?" },
    { text: "Oh cool! I'm learning to ride my bike without training wheels! What can you do that's cool?", translationKo: "오 멋져! 나 보조 바퀴 없이 자전거 타는 거 배우고 있어! 너 뭐 멋진 거 할 수 있어?" },
    { text: "Hi hi! Do you like animals? I want a bunny sooo bad!", translationKo: "안녕 안녕! 너 동물 좋아해? 나 토끼 진짜 너무 키우고 싶어!" },
  ],
  henry: [
    { text: "Whoa, I just built the coolest LEGO set ever! Do you like building stuff?", translationKo: "와, 나 방금 역대급 레고 세트 만들었어! 너 뭐 만드는 거 좋아해?" },
    { text: "No way, I just beat my high score in this game! Do you play any games?", translationKo: "말도 안 돼, 나 방금 게임 최고 점수 깼어! 너 게임 해?" },
    { text: "That's epic! Hey, do you like pizza? I could eat pizza every single day!", translationKo: "대박! 야, 너 피자 좋아해? 나 매일 피자 먹을 수 있어!" },
    { text: "Dude, I just learned this crazy science fact. Wanna hear something cool?", translationKo: "야, 나 방금 미친 과학 사실 알았어. 뭔가 신기한 거 들을래?" },
    { text: "Hey hey! What's the most fun thing you did today?", translationKo: "야야! 오늘 가장 재밌었던 거 뭐야?" },
    { text: "Wanna know something? I'm trying to learn to skateboard and I keep falling!", translationKo: "나 말이야, 스케이트보드 배우려는데 계속 넘어져!" },
    { text: "Oh wait, do you like dinosaurs? T-Rex is obviously the best one, right?", translationKo: "아 잠깐, 너 공룡 좋아해? 티라노사우루스가 당연히 최고지, 맞지?" },
    { text: "No way, guess what happened at school today! Actually, you first — how was your day?", translationKo: "말도 안 돼, 오늘 학교에서 무슨 일 있었는지 알아! 사실, 너 먼저 — 오늘 어땠어?" },
    { text: "That's epic, I just found a really cool bug outside. Do you like nature stuff?", translationKo: "대박, 나 밖에서 진짜 멋진 벌레 찾았어. 너 자연 관련된 거 좋아해?" },
    { text: "Dude! If you could be any animal, what would you be? I'd be a hawk!", translationKo: "야! 너 아무 동물이나 될 수 있으면 뭐가 될 거야? 나는 매!" },
  ],
};

function getRecentOpeners(tutorId: string): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_OPENERS_KEY);
    if (!stored) return [];
    const all: Record<string, number[]> = JSON.parse(stored);
    return all[tutorId] || [];
  } catch {
    return [];
  }
}

function saveRecentOpener(tutorId: string, index: number): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(RECENT_OPENERS_KEY);
    const all: Record<string, number[]> = stored ? JSON.parse(stored) : {};
    const recent = all[tutorId] || [];
    recent.push(index);
    if (recent.length > MAX_RECENT) {
      recent.splice(0, recent.length - MAX_RECENT);
    }
    all[tutorId] = recent;
    localStorage.setItem(RECENT_OPENERS_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable
  }
}

export function getRandomOpener(tutorId: string): TutorOpener {
  const openers = openersByTutor[tutorId];
  if (!openers || openers.length === 0) {
    return { text: "Hey, how's it going?", translationKo: "안녕, 어떻게 지내?" };
  }

  const recent = getRecentOpeners(tutorId);
  const available = openers
    .map((opener, index) => ({ opener, index }))
    .filter(({ index }) => !recent.includes(index));

  const pool = available.length > 0 ? available : openers.map((opener, index) => ({ opener, index }));
  const pick = pool[Math.floor(Math.random() * pool.length)];

  saveRecentOpener(tutorId, pick.index);
  return pick.opener;
}

export function getOpenersList(tutorId: string): TutorOpener[] {
  return openersByTutor[tutorId] || [];
}
