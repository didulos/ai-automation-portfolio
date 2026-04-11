RLHF

# RLHF

## 정의
[[RLHF]](Reinforcement Learning from Human Feedback)는 인간의 피드백을 기반으로 [[LLM]](대규모 언어모델)을 강화학습(reinforcement learning)으로 미세 조정하는 방법이다. 모델이 생성한 응답에 대해 인간이 순위를 매기거나 평가하면, 이를 보상 신호(reward signal)로 변환하여 모델 학습에 활용한다.

## 왜 중요한가
사용자의 의도(intent)에 맞는 안전하고 유용한 응답을 생성하도록 모델을 정렬(alignment)시킬 수 있어, 현대 [[LLM]]의 실무 배포에 필수적인 기술이다.

## 관련 개념

**상위 개념:**
- [[Fine-Tuning]](미세 조정)

**하위 개념:**
- [[Reward-Model]](보상 모델): 인간 평가를 학습하여 자동으로 응답 품질을 점수화하는 모델
- [[PPO]](Proximal Policy Optimization): RLHF 학습에 자주 사용되는 강화학습 알고리즘

**연관 개념:**
- [[SFT]](Supervised Fine-Tuning - 지도 학습 미세 조정): RLHF 이전 단계로 기본 능력을 갖추는 과정
- [[DPO]](Direct Preference Optimization - 직접 선호도 최적화): RLHF의 복잡성을 단순화한 대안
- [[Prompt-Engineering]](프롬프트 엔지니어링): 모델 응답 품질 향상의 다른 접근 방식

## 비유로 이해하기
학생(모델)이 시험 문제를 풀고, 선생님(인간 평가자)이 답안을 채점하면서 "이 풀이가 더 좋다/나쁘다"는 피드백을 주어, 학생이 선생님이 원하는 스타일의 답변 방식을 점차 배워나가는 과정과 같다.

## 실제 사용 예시
ChatGPT, Claude 같은 최신 [[LLM]]들은 [[RLHF]]를 통해 유해한 콘텐츠는 거절하고 정직하고 도움이 되는 응답을 하도록 훈련되었다. 대규모 모델을 실제 제품화할 때 인간 평가자 팀을 구성하여 단계적으로 [[RLHF]]를 적용한다.