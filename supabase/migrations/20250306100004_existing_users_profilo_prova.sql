-- Una tantum: tutti gli utenti già esistenti possono accedere senza verifica email
-- (stesso gruppo degli account di prova).
update public.profiles set profilo_prova = true where profilo_prova is not true;
