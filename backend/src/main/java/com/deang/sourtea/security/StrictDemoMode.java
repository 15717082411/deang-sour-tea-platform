package com.deang.sourtea.security;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.env.Environment;
import org.springframework.core.type.AnnotatedTypeMetadata;

public final class StrictDemoMode {
    private StrictDemoMode() {
    }

    static boolean isActive(Environment environment) {
        String[] activeProfiles = environment.getActiveProfiles();
        return activeProfiles.length == 1 && "demo".equals(activeProfiles[0]);
    }

    public static final class EnabledCondition implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            return isActive(context.getEnvironment());
        }
    }

    public static final class DisabledCondition implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            return !isActive(context.getEnvironment());
        }
    }
}
