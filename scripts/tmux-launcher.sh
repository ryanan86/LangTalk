#!/bin/bash
#
# tmux-launcher.sh
#
# Claude 양방향 텔레그램 봇을 tmux 세션에서 실행.
# 터미널을 닫아도 봇이 백그라운드에서 계속 동작.
#
# 사용법:
#   ./tmux-launcher.sh          # 봇 시작
#   ./tmux-launcher.sh stop     # 봇 중지
#   ./tmux-launcher.sh restart  # 봇 재시작
#   ./tmux-launcher.sh status   # 상태 확인
#   ./tmux-launcher.sh logs     # 로그 확인 (tail -f)
#

SESSION_NAME="claude-telegram"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BOT_SCRIPT="$SCRIPT_DIR/telegram-bot-v2.mjs"
LOG_DIR="/tmp/claude-telegram-logs"
LOG_FILE="$LOG_DIR/bot-$(date +%Y%m%d).log"
DECISIONS_DIR="/tmp/claude-telegram-decisions"
NODE_PATH="$HOME/local/node/bin"
BREW_PATH="/opt/homebrew/bin"
export PATH="$BREW_PATH:$NODE_PATH:$PATH"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 로그/결정 디렉토리 초기화
init_dirs() {
  mkdir -p "$LOG_DIR"
  mkdir -p "$DECISIONS_DIR"
  # 이전 결정 파일 정리
  rm -f "$DECISIONS_DIR/response.json"
  rm -f "$DECISIONS_DIR/question.json"
}

# tmux 세션 존재 여부 확인
session_exists() {
  tmux has-session -t "$SESSION_NAME" 2>/dev/null
}

# 봇 시작
start_bot() {
  if session_exists; then
    echo -e "${YELLOW}⚠️  이미 실행 중인 세션이 있습니다: $SESSION_NAME${NC}"
    echo "   상태 확인: $0 status"
    echo "   재시작: $0 restart"
    return 1
  fi

  init_dirs

  echo -e "${GREEN}🚀 Claude 양방향 텔레그램 봇 시작...${NC}"
  echo "   세션: $SESSION_NAME"
  echo "   로그: $LOG_FILE"

  # tmux 세션 생성 + 봇 실행 (크래시 시 5초 후 자동 재시작)
  tmux new-session -d -s "$SESSION_NAME" \
    "export PATH=\"$NODE_PATH:\$PATH\"; cd \"$SCRIPT_DIR\"; while true; do node \"$BOT_SCRIPT\" 2>&1 | tee -a \"$LOG_FILE\"; echo \"[$(date)] Bot crashed. Restarting in 5s...\" | tee -a \"$LOG_FILE\"; sleep 5; done"

  sleep 1

  if session_exists; then
    echo -e "${GREEN}✅ 봇이 시작되었습니다!${NC}"
    echo ""
    echo "   세션 접속: tmux attach -t $SESSION_NAME"
    echo "   로그 확인: $0 logs"
    echo "   중지: $0 stop"
  else
    echo -e "${RED}❌ 봇 시작 실패. 로그를 확인하세요:${NC}"
    echo "   cat $LOG_FILE"
    return 1
  fi
}

# 봇 중지
stop_bot() {
  if ! session_exists; then
    echo -e "${YELLOW}⚠️  실행 중인 세션이 없습니다.${NC}"
    return 0
  fi

  echo -e "${YELLOW}⏹️  봇 중지 중...${NC}"
  tmux kill-session -t "$SESSION_NAME" 2>/dev/null
  echo -e "${GREEN}✅ 봇이 중지되었습니다.${NC}"
}

# 상태 확인
check_status() {
  if session_exists; then
    echo -e "${GREEN}✅ 봇 실행 중${NC}"
    echo "   세션: $SESSION_NAME"
    echo ""

    # 대기 중인 질문 확인
    if [ -f "$DECISIONS_DIR/question.json" ]; then
      echo -e "${YELLOW}❓ 대기 중인 질문:${NC}"
      cat "$DECISIONS_DIR/question.json" | python3 -m json.tool 2>/dev/null || cat "$DECISIONS_DIR/question.json"
      echo ""
    fi

    # 최근 로그
    echo "📋 최근 로그 (마지막 5줄):"
    tail -5 "$LOG_FILE" 2>/dev/null || echo "   로그 없음"
  else
    echo -e "${RED}⏸️  봇이 실행되고 있지 않습니다.${NC}"
    echo "   시작: $0"
  fi
}

# 로그 실시간 확인
show_logs() {
  if [ -f "$LOG_FILE" ]; then
    echo "📋 로그 파일: $LOG_FILE (Ctrl+C로 종료)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -f "$LOG_FILE"
  else
    echo -e "${YELLOW}⚠️  로그 파일이 없습니다.${NC}"
  fi
}

# 메인 로직
case "${1:-start}" in
  start)
    start_bot
    ;;
  stop)
    stop_bot
    ;;
  restart)
    stop_bot
    sleep 1
    start_bot
    ;;
  status)
    check_status
    ;;
  logs|log)
    show_logs
    ;;
  *)
    echo "사용법: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "  start   - 봇 시작 (기본)"
    echo "  stop    - 봇 중지"
    echo "  restart - 봇 재시작"
    echo "  status  - 상태 확인"
    echo "  logs    - 실시간 로그 확인"
    ;;
esac
